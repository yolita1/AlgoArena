import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  Room, Player, Language, PlayerPublic, GameMode, LevelFilter,
  JoinLobbyPayload, SubmitCodePayload, RunTestsPayload, RequestCodePayload, ChatPayload,
  ChatMessagePayload,
} from '../types';
import { getRandomProblem, toPublicProblem, getProblemsForLevel } from '../problems';
import { judgeSubmission, judgeVisible } from '../judge/Judge';
import { socketAuth } from '../auth/middleware';
import db, { getUserById, updateUserPoints, updateStreak, updateClanPoints, DBUser } from '../db/database';
import { RANK_POINTS, getDifficultyMultiplier, getPlayerRank as getGrade, calcLpDelta, getPlayerRank, checkBadgeUnlock, MODE_LP_MULTIPLIER } from '../db/grades';
import { analyseComplexity } from '../judge/Complexity';
import { publicUser } from '../routes/auth';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROOM_CAPACITY: Record<GameMode, number> = {
  normal:        5,
  best_of_5:     5,
  panic:         5,
  buggy_code:    5,
  sudden_death:  5,
  hyper_rush:    5,
  battle_royale: 10,
  team_2v2:      4,
  king_of_hill:  5,
  duel_1v1:      2,
  optimization:   5,
  duel_streak:    2,
};

const MODE_DURATION: Record<GameMode, number> = {
  normal:        840,
  best_of_5:     600,
  panic:         30,
  buggy_code:    600,
  sudden_death:  420,
  hyper_rush:    180,
  battle_royale: 300,
  team_2v2:      600,
  king_of_hill:  300,
  duel_1v1:      600,
  optimization:   720,
  duel_streak:    600,
};

const MODE_ROUNDS: Record<GameMode, number> = {
  normal:        1,
  best_of_5:     5,
  panic:         1,
  buggy_code:    1,
  sudden_death:  1,
  hyper_rush:    3,
  battle_royale: 1,
  team_2v2:      1,
  king_of_hill:  1,
  duel_1v1:      1,
  optimization:   1,
  duel_streak:    3,
};

const COUNTDOWN     = 6;  // seconds before game starts
const BOT_FILL_WAIT = 12; // seconds before bots fill empty slots

const BOT_NAMES = [
  'kayou','Ryoiki_Tenkai','Fiaro_Iarilanja','AlluvianDev','xXCoderXx',
  'algo_wizard','dark_compiler','NullPointer','segfault_pro','ByteBender',
  'ptr_wizard','stack_smasher','heap_hunter','bit_flipper','recursive_rex',
];
const BOT_LANGS: Language[] = ['c', 'python', 'ocaml', 'python', 'c', 'python'];

// ─── Global state ─────────────────────────────────────────────────────────────

const rooms         = new Map<string, Room>();
const socketToRoom  = new Map<string, string>();
const sessionScores = new Map<string, number>();
// socketId → online user info (set on connect if token present)
// Revenge tracking: loser socketId → winner socketId (for duel)
const revengeMap = new Map<string, string>();

const onlineUsers   = new Map<string, { userId: string; username: string; avatar: string | null; establishment: string; level: 'pre_bac' | 'post_bac'; grade: { name: string; color: string; glow: string; icon: string } }>();

// ─── Setup ────────────────────────────────────────────────────────────────────

export function setupGameHandlers(io: Server, socket: Socket): void {
  sessionScores.set(socket.id, 0);

  // Authenticate if token present
  const token = socket.handshake.auth?.token as string | undefined;
  if (token) {
    const auth = socketAuth(token);
    if (auth) {
      const dbUser = getUserById(auth.userId);
      if (dbUser && !dbUser.banned) {
        const g = getGrade(dbUser.totalLp || 0);
        onlineUsers.set(socket.id, {
          userId:        dbUser.id,
          username:      dbUser.username,
          avatar:        dbUser.avatar,
          establishment: dbUser.establishment,
          level:         dbUser.level,
          grade:         { name: g.displayName ?? g.tier, color: g.color, glow: g.glow, icon: g.icon },
        });
      }
    }
  }

  socket.on('create_room',  (p: { playerName: string; mode: GameMode; levelFilter: LevelFilter }) => handleCreateRoom(io, socket, p));
  socket.on('request_revenge', (p: { roomId: string }) => handleRevenge(io, socket, p));
  socket.on('leave_room', () => handleLeaveRoom(io, socket));
  socket.on('join_lobby',   (p: JoinLobbyPayload)    => handleJoinLobby(io, socket, p));
  socket.on('player_ready', ()                        => handlePlayerReady(io, socket));
  socket.on('run_tests',    async (p: RunTestsPayload)    => handleRun(io, socket, p));
  socket.on('submit_code',  async (p: SubmitCodePayload)  => handleSubmit(io, socket, p));
  socket.on('request_code', (p: RequestCodePayload)   => handleRequestCode(socket, p));
  socket.on('chat_message', (p: ChatPayload)          => handleChat(io, socket, p));
  socket.on('invite_friend',(p: { friendSocketId: string }) => handleInvite(io, socket, p));
  socket.on('disconnect',   ()                        => handleDisconnect(io, socket));
  socket.on('quit_game',    ()                        => handleQuitGame(io, socket));
  socket.on('report',       (p: { type: string; message: string; context?: string }) => handleReport(socket, p));
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function handleCreateRoom(io: Server, socket: Socket, payload: { playerName: string; mode: GameMode; levelFilter: LevelFilter }): void {
  const mode  = payload.mode  || 'normal';
  const level = payload.levelFilter || 'all';
  const room  = createRoom('private', mode, level);
  joinRoom(socket, room, sanitise(payload.playerName));
  socket.emit('room_created', { roomId: room.id });
  emitLobby(io, room);
}

function handleJoinLobby(io: Server, socket: Socket, payload: JoinLobbyPayload): void {
  const name  = sanitise(payload.playerName);
  const mode  = (payload.mode  || 'normal') as GameMode;
  const level = (payload.levelFilter || 'all') as LevelFilter;

  if (payload.roomCode) {
    const room = rooms.get(payload.roomCode.toUpperCase());
    if (!room)                     { socket.emit('error', { message: 'Room not found.' });          return; }
    if (room.state !== 'waiting')  { socket.emit('error', { message: 'Game already started.' });    return; }
    if (room.players.size >= ROOM_CAPACITY[room.mode]) { socket.emit('error', { message: 'Room is full.' }); return; }
    joinRoom(socket, room, name);
    emitLobby(io, room);
    return;
  }

  // Quick match — find public room with same mode/level or create
  let room = findPublicRoom(mode, level);
  if (!room) room = createRoom('public', mode, level);

  // Apply forced problem if provided
  if (payload.forcedProblemId) {
    room.forcedProblemId = payload.forcedProblemId;
  }

  joinRoom(socket, room, name);
  emitLobby(io, room);

  // Solo practice mode: fill bots and auto-ready immediately
  if (payload.soloMode) {
    fillBots(room);
    room.players.forEach(p => { p.ready = true; });
    emitLobby(io, room, 0);
    setTimeout(() => startRound(io, room), 1000);
    return;
  }

  // Only set timers once per room (when the FIRST real player joins)
  const realCount = [...room.players.values()].filter(p => !p.isBot).length;
  if (realCount === 1) {
    // Auto-fill with bots after BOT_FILL_WAIT seconds
    setTimeout(() => {
      if (room.state !== 'waiting') return;
      if (room.players.size < ROOM_CAPACITY[room.mode]) {
        fillBots(room);
        emitLobby(io, room);
      }
    }, BOT_FILL_WAIT * 1000);

    // Auto-start after 30s regardless of ready status
    setTimeout(() => {
      if (room.state !== 'waiting') return;
      const realNow = [...room.players.values()].filter(p => !p.isBot);
      if (realNow.length === 0) return;
      room.players.forEach(p => { p.ready = true; });
      if (room.players.size < ROOM_CAPACITY[room.mode]) fillBots(room);
      emitLobby(io, room, 0);
      startRound(io, room);
    }, 30_000);
  }
}

function handlePlayerReady(io: Server, socket: Socket): void {
  const room = roomOf(socket.id);
  if (!room || room.state !== 'waiting') return;
  const p = room.players.get(socket.id);
  if (!p || p.isBot) return;
  p.ready = !p.ready;
  emitLobby(io, room);
  checkAllReady(io, room);
}

async function handleRun(io: Server, socket: Socket, payload: RunTestsPayload): Promise<void> {
  const room = roomOf(socket.id);
  if (!room || room.state !== 'playing' || !room.problem) { socket.emit('error', { message: 'No active game.' }); return; }
  try {
    const result = await judgeVisible(payload.code, payload.language, room.problem);
    socket.emit('run_result', result);
  } catch { socket.emit('run_result', { results: [], totalTests: 0, passedTests: 0, timeMs: 0 }); }
}

async function handleSubmit(io: Server, socket: Socket, payload: SubmitCodePayload): Promise<void> {
  const room = roomOf(socket.id);
  if (!room || room.state !== 'playing' || !room.problem) {
    socket.emit('submit_result', { results: [], passed: false, rank: null, timeMs: 0, error: 'No active game.' }); return;
  }
  const player = room.players.get(socket.id);
  if (!player) return;

  // Sudden death: only one attempt
  if (room.mode === 'sudden_death' && player.attempts > 0) {
    socket.emit('submit_result', { results: [], passed: false, rank: null, timeMs: 0, error: 'Only one attempt allowed in Sudden Death mode.' }); return;
  }
  if (player.rank !== null) {
    socket.emit('submit_result', { results: [], passed: false, rank: player.rank, timeMs: 0, error: 'Already submitted.' }); return;
  }

  player.attempts++;
  const judgeRes = await judgeSubmission(payload.code, payload.language, room.problem);
  const { results, passed, totalMs } = judgeRes;

  if (passed) {
    const rank    = nextRank(room);
    const elapsed = room.startTime ? Date.now() - room.startTime : 0;
    const mult    = getDifficultyMultiplier(room.problem.difficulty);
    const pts     = Math.round((RANK_POINTS[room.mode]?.[rank - 1] ?? 10) * mult);

    player.rank       = rank;
    player.finishTime = elapsed;
    player.code       = payload.code;
    player.language   = payload.language;

    sessionScores.set(socket.id, (sessionScores.get(socket.id) ?? 0) + pts);

    // Persist to DB if user is logged in
    if (player.userId) {
      updateUserPoints(player.userId, pts);
      updateStreak(player.userId);
      // Update stats
      const dbUser = getUserById(player.userId);
      if (dbUser) {
        db.get('users').find({ id: player.userId }).assign({
          gamesWon:    (dbUser.gamesWon    || 0) + (rank === 1 ? 1 : 0),
        }).write();
      }
      if (dbUser?.clanId) updateClanPoints(dbUser.clanId, pts);
    }

    // Optimization mode: score complexity (lower = better)
    // O(1)=1, O(log n)=2, O(n)=3, O(n log n)=4, O(n²)=5, O(n³)=6, O(2ⁿ)=7
    const CX_SCORE: Record<string,number> = {'O(1)':1,'O(log n)':2,'O(n)':3,'O(n log n)':4,'O(n²)':5,'O(n³)':6,'O(2ⁿ)':7};
    const cxResult = judgeRes.complexity;
    if (room.mode === 'optimization' && cxResult) {
      player.complexityScore = CX_SCORE[cxResult.time] ?? 5;
    }
    socket.emit('submit_result', { results, passed: true, rank, timeMs: totalMs, pointsEarned: pts, complexity: cxResult ? { time: cxResult.time, space: cxResult.space, notes: cxResult.notes } : undefined });
    emitPlayerUpdate(io, room);

    if (allRealDone(room)) scheduleEnd(io, room, 3000);
  } else {
    socket.emit('submit_result', { results, passed: false, rank: null, timeMs: totalMs });
  }
}

function handleRequestCode(socket: Socket, payload: RequestCodePayload): void {
  const room = roomOf(socket.id);
  if (!room || room.state !== 'finished') return;
  const t = room.players.get(payload.targetPlayerId);
  if (!t?.code || !t.language) return;
  socket.emit('player_code', { playerId: t.socketId, name: t.name, code: t.code, language: t.language });
}

function handleChat(io: Server, socket: Socket, payload: ChatPayload): void {
  const room = roomOf(socket.id);
  if (!room || room.state !== 'playing') return;
  const player = room.players.get(socket.id);
  if (!player || player.isBot) return;

  const text = String(payload.text || '').trim().slice(0, 200);
  if (!text) return;

  const msg: ChatMessagePayload = {
    id:        uuidv4().slice(0, 8),
    socketId:  socket.id,
    name:      player.name,
    avatar:    player.avatar,
    text,
    timestamp: Date.now(),
  };

  io.to(room.id).emit('chat_message', msg);
}

function handleInvite(io: Server, socket: Socket, payload: { friendSocketId: string }): void {
  const room = roomOf(socket.id);
  if (!room || room.state !== 'waiting') return;
  const sender = room.players.get(socket.id);
  io.to(payload.friendSocketId).emit('game_invite', {
    fromName: sender?.name ?? 'Someone',
    roomId:   room.id,
    mode:     room.mode,
  });
}

function handleDisconnect(io: Server, socket: Socket): void {
  onlineUsers.delete(socket.id);
  const room = roomOf(socket.id);
  socketToRoom.delete(socket.id);
  setTimeout(() => sessionScores.delete(socket.id), 5 * 60 * 1000);
  if (!room) return;

  if (room.state === 'waiting' || room.state === 'countdown') {
    if (room.countdownInterval) {
      clearInterval(room.countdownInterval);
      room.countdownInterval = null;
      room.state = 'waiting';
    }
    room.players.delete(socket.id);
    emitLobby(io, room);
    if (room.players.size === 0) { clearRoom(room); rooms.delete(room.id); }
  } else if (room.state === 'playing') {
    // Mark as eliminated so allRealDone() can still complete
    const p = room.players.get(socket.id);
    if (p) {
      p.eliminated = true;
      emitPlayerUpdate(io, room);
      // If all remaining real non-eliminated players are done, end game
      if (allRealDone(room)) scheduleEnd(io, room, 3000);
    }
  }
}

// ─── Room lifecycle ───────────────────────────────────────────────────────────

function createRoom(type: 'public' | 'private', mode: GameMode, levelFilter: LevelFilter): Room {
  const lets = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const code = lets[Math.floor(Math.random() * lets.length)]
             + lets[Math.floor(Math.random() * lets.length)]
             + String(Math.floor(1000 + Math.random() * 9000));
  const room: Room = {
    id: code, type, mode, levelFilter, state: 'waiting',
    players: new Map(), problem: null, startTime: null,
    currentRound: 1, totalRounds: MODE_ROUNDS[mode],
    roundScores: new Map(),
    countdownInterval: null, botTimers: [], gameEndTimer: null,
    forcedProblemId: null,
  };
  rooms.set(code, room);
  return room;
}

function joinRoom(socket: Socket, room: Room, name: string): void {
  const online  = onlineUsers.get(socket.id);
  const player: Player = {
    socketId:      socket.id,
    userId:        online?.userId ?? null,
    name:          online?.username ?? name,
    avatar:        online?.avatar ?? null,
    establishment: online?.establishment ?? '',
    level:         online?.level ?? 'pre_bac',
    grade:         online?.grade ?? null,
    ready:         false,
    isBot:         false,
    rank:          null,
    finishTime:    null,
    code:          null,
    language:      null,
    teamId:        null,
    eliminated:    false,
    attempts:      0,
    complexityScore: 999,
  };
  room.players.set(socket.id, player);
  socketToRoom.set(socket.id, room.id);
  socket.join(room.id);
}

function fillBots(room: Room): void {
  const cap   = ROOM_CAPACITY[room.mode];
  const used  = new Set([...room.players.values()].map((p) => p.name));
  const avail = BOT_NAMES.filter((n) => !used.has(n));
  let i = 0;
  while (room.players.size < cap) {
    const botId = `bot_${uuidv4().slice(0, 8)}`;
    const bot: Player = {
      socketId: botId, userId: null,
      name: avail[i % avail.length] ?? `bot_${i}`,
      avatar: null, establishment: 'Bot Academy',
      level: 'post_bac', grade: null,
      ready: true, isBot: true,
      rank: null, finishTime: null, code: null,
      language: BOT_LANGS[Math.floor(Math.random() * BOT_LANGS.length)],
      teamId: null, eliminated: false, attempts: 0, complexityScore: 999,
    };
    room.players.set(botId, bot);
    i++;
  }
}

function checkAllReady(io: Server, room: Room): void {
  if (![...room.players.values()].every((p) => p.ready)) return;
  room.state = 'countdown';
  let n = COUNTDOWN;
  emitLobby(io, room, n);
  room.countdownInterval = setInterval(() => {
    n--;
    if (n > 0) emitLobby(io, room, n);
    else { clearInterval(room.countdownInterval!); startRound(io, room); }
  }, 1000);
}

function startRound(io: Server, room: Room): void {
  room.state = 'playing';

  // Reset per-round state
  room.players.forEach((p) => {
    p.rank = null; p.finishTime = null; p.code = null; p.language = null;
    p.eliminated = false; p.attempts = 0;
  });

  // Pick problem matching level filter (and mode constraints)
  let probs = getProblemsForLevel(room.levelFilter);
  
  // Forced problem for practice mode
  if (room.forcedProblemId) {
    const forced = probs.find(p => p.id === room.forcedProblemId)
      || getProblemsForLevel('all').find(p => p.id === room.forcedProblemId);
    if (forced) { room.problem = forced; }
    else { room.problem = probs.length > 0 ? probs[Math.floor(Math.random() * probs.length)] : getRandomProblem(); }
  } else if (room.mode === 'buggy_code') {
    // Only pick problems that have buggy starter code
    const buggyProbs = probs.filter(p => (p as any).isBuggyCode === true);
    room.problem = buggyProbs.length > 0
      ? buggyProbs[Math.floor(Math.random() * buggyProbs.length)]
      : probs[Math.floor(Math.random() * probs.length)];
  } else {
    room.problem = probs.length > 0 ? probs[Math.floor(Math.random() * probs.length)] : getRandomProblem();
  }
  room.startTime = Date.now();

  const dur = getRoundDuration(room);

  // Increment gamesPlayed for all logged-in players
  room.players.forEach(p => {
    if (p.userId && !p.isBot) {
      const u = getUserById(p.userId);
      if (u) db.get('users').find({ id: p.userId }).assign({ gamesPlayed: (u.gamesPlayed || 0) + 1 }).write();
    }
  });

  io.to(room.id).emit('game_start', {
    problem:         toPublicProblem(room.problem),
    players:         pubPlayers(room),
    startTime:       room.startTime,
    durationSeconds: dur,
    mode:            room.mode,
    round:           room.currentRound,
    totalRounds:     room.totalRounds,
  });

  scheduleBots(io, room);

  room.gameEndTimer = setTimeout(() => endRound(io, room), dur * 1000);
}

function getRoundDuration(room: Room): number {
  const base = MODE_DURATION[room.mode];
  // Hyper rush: each round is shorter
  if (room.mode === 'hyper_rush') return Math.max(60, base - (room.currentRound - 1) * 40);
  return base;
}

function scheduleBots(io: Server, room: Room): void {
  if (!room.problem) return;
  const bots = [...room.players.values()].filter((p) => p.isBot && !p.eliminated);

  bots.forEach((bot, idx) => {
    const entry =
      room.problem!.botCodes.find((bc) => bc.language === bot.language) ??
      room.problem!.botCodes[idx % Math.max(1, room.problem!.botCodes.length)];

    const dur     = getRoundDuration(room);
    const jitter  = Math.floor(Math.random() * 20);
    const raw     = (entry?.submitDelay ?? 60) + jitter;
    const delayMs = Math.min(raw, dur - 5) * 1000;

    const t = setTimeout(() => {
      if (room.state !== 'playing') return;
      const rank    = nextRank(room);
      const elapsed = room.startTime ? Date.now() - room.startTime : 0;
      bot.rank       = rank;
      bot.finishTime = elapsed;
      bot.code       = entry?.code ?? '';
      bot.language   = entry?.language as Language ?? 'python';
      emitPlayerUpdate(io, room);
      if (allRealDone(room)) scheduleEnd(io, room, 3000);
    }, delayMs);

    room.botTimers.push(t);
  });
}

function scheduleEnd(io: Server, room: Room, ms: number): void {
  if (room.gameEndTimer) clearTimeout(room.gameEndTimer);
  room.gameEndTimer = setTimeout(() => endRound(io, room), ms);
}

function endRound(io: Server, room: Room): void {
  if (room.state === 'finished') return;
  clearRoom(room);

  const codes: Record<string, { code: string; language: Language } | null> = {};
  room.players.forEach((p) => {
    room.roundScores.set(p.socketId, (room.roundScores.get(p.socketId) ?? 0) + (p.rank === 1 ? 1 : 0));
    codes[p.socketId] = p.code && p.language ? { code: p.code, language: p.language } : null;
  });

  const moreRounds = room.currentRound < room.totalRounds;

  room.state = 'finished';
  // Optimization mode: re-rank by complexity score (all must have passed)
  if (room.mode === 'optimization') {
    const ranked = [...room.players.values()]
      .filter(p => p.rank !== null)
      .sort((a, b) => a.complexityScore - b.complexityScore);
    ranked.forEach((p, i) => { p.rank = i + 1; });
  }

  // For 1v1, track who lost for revenge
  if (room.mode === 'duel_1v1') {
    const sorted = [...room.players.values()].filter(p=>!p.isBot).sort((a,b)=>(a.rank??99)-(b.rank??99));
    if (sorted.length >= 2) {
      const loser = sorted[sorted.length-1];
      const winner = sorted[0];
      revengeMap.set(loser.socketId, winner.socketId);
      setTimeout(()=>revengeMap.delete(loser.socketId), 5*60*1000);
    }
  }
  io.to(room.id).emit('game_end', {
    players:     pubPlayers(room),
    codes,
    round:       room.currentRound,
    totalRounds: room.totalRounds,
    modeOver:    !moreRounds,
  });

  if (moreRounds) {
    room.currentRound++;
    // Brief pause before next round
    setTimeout(() => {
      if (rooms.has(room.id)) startRound(io, room);
    }, 8000);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextRank(room: Room): number {
  const ranks = [...room.players.values()]
    .map((p) => p.rank).filter((r): r is number => r !== null);
  return ranks.length > 0 ? Math.max(...ranks) + 1 : 1;
}

function allRealDone(room: Room): boolean {
  return [...room.players.values()].filter((p) => !p.isBot && !p.eliminated).every((p) => p.rank !== null);
}

function findPublicRoom(mode: GameMode, level: LevelFilter): Room | null {
  const cap = ROOM_CAPACITY[mode];
  for (const r of rooms.values()) {
    if (r.type === 'public' && r.state === 'waiting' && r.mode === mode &&
        (r.levelFilter === level || r.levelFilter === 'all' || level === 'all') &&
        r.players.size < cap) return r;
  }
  return null;
}

function roomOf(sid: string): Room | null {
  const id = socketToRoom.get(sid);
  return id ? rooms.get(id) ?? null : null;
}

function pubPlayers(room: Room): PlayerPublic[] {
  return [...room.players.values()].map((p) => ({
    id:           p.socketId,
    userId:       p.userId,
    name:         p.name,
    avatar:       p.avatar,
    establishment:p.establishment,
    level:        p.level,
    grade:        p.grade,
    ready:        p.ready,
    isBot:        p.isBot,
    rank:         p.rank,
    finishTime:   p.finishTime,
    language:     p.language,
    sessionScore: sessionScores.get(p.socketId) ?? 0,
    teamId:       p.teamId,
    eliminated:   p.eliminated,
  }));
}

function emitLobby(io: Server, room: Room, countdown?: number): void {
  io.to(room.id).emit('lobby_update', {
    roomId: room.id, mode: room.mode, levelFilter: room.levelFilter,
    players: pubPlayers(room), state: room.state, countdown,
  });
}

function emitPlayerUpdate(io: Server, room: Room): void {
  io.to(room.id).emit('player_update', { players: pubPlayers(room) });
}

function clearRoom(room: Room): void {
  if (room.countdownInterval) clearInterval(room.countdownInterval);
  if (room.gameEndTimer)      clearTimeout(room.gameEndTimer);
  room.botTimers.forEach((t) => clearTimeout(t));
  room.botTimers = [];
}

function handleLeaveRoom(io: Server, socket: Socket): void {
  const room = roomOf(socket.id);
  socketToRoom.delete(socket.id);   // Fix: always clean up mapping
  if (!room) return;

  // If leaving during countdown, clear the countdown timer
  if (room.state === 'countdown' || room.state === 'waiting') {
    if (room.countdownInterval) {
      clearInterval(room.countdownInterval);
      room.countdownInterval = null;
      room.state = 'waiting';
    }
  }

  room.players.delete(socket.id);
  socket.leave(room.id);

  if (room.players.size === 0) {
    clearRoom(room);
    rooms.delete(room.id);
    return;
  }
  // Notify remaining players
  if (room.state === 'waiting') {
    emitLobby(io, room);
  }
}

function handleQuitGame(io: Server, socket: Socket): void {
  // Same as leave but during active game — marks player as eliminated first
  const room = roomOf(socket.id);
  socketToRoom.delete(socket.id);
  if (!room) return;

  if (room.state === 'playing') {
    const p = room.players.get(socket.id);
    if (p) {
      p.eliminated = true;
      emitPlayerUpdate(io, room);
      if (allRealDone(room)) scheduleEnd(io, room, 2000);
    }
  }
  if (room.state === 'countdown' || room.state === 'waiting') {
    if (room.countdownInterval) { clearInterval(room.countdownInterval); room.countdownInterval = null; room.state = 'waiting'; }
  }
  room.players.delete(socket.id);
  socket.leave(room.id);
  if (room.players.size === 0) { clearRoom(room); rooms.delete(room.id); }
  else if (room.state === 'waiting') emitLobby(io, room);
}

function handleReport(socket: Socket, payload: { type: string; message: string; context?: string }): void {
  // Reports are saved via the API route — here we just log them
  const online = onlineUsers.get(socket.id);
  console.log(`[REPORT] type=${payload.type} from=${online?.username ?? 'anon'} msg="${payload.message}" ctx=${payload.context ?? '-'}`);
  // Acknowledge to client
  socket.emit('report_received', { message: 'Thank you for your report!' });
}

function handleRevenge(io: Server, socket: Socket, payload: { roomId: string }): void {
  // Check if this socket was in the referenced room as a loser
  const loserSocketId = socket.id;
  const winnerSocketId = revengeMap.get(loserSocketId);
  if (!winnerSocketId) {
    socket.emit('error', { message: 'No revenge available.' });
    return;
  }
  const p = roomOf(socket.id);
  const loserName = p?.players.get(loserSocketId)?.name ?? 'Someone';
  // Send revenge invite to winner
  io.to(winnerSocketId).emit('revenge_challenge', {
    fromName:  loserName,
    fromId:    loserSocketId,
    mode:      'duel_1v1',
  });
}

function sanitise(raw: string): string {
  return (raw || '').trim().slice(0, 20) || 'Anonymous';
}
