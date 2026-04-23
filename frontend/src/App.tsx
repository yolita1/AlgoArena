import { useState, useEffect, useCallback, useRef } from 'react';
import { socket, connectSocket, disconnectSocket } from './socket';
import { useAuth } from './context/AuthContext';
import {
  GameState, Language, AppPage, GameMode, LevelFilter,
  LobbyUpdatePayload, GameStartPayload, PlayerUpdatePayload,
  RunResultPayload, SubmitResultPayload, GameEndPayload,
  ChatMessagePayload, GameInvitePayload, RevengePayload,
  ProblemPublic,
} from './types';

import HomeScreen      from './components/HomeScreen';
import { LobbyScreen, GameScreen, PodiumScreen } from './components/GameScreens';
import { ProfilePage, ProblemLibrary, LeaderboardPage,
         SubmitProblemPage, AdminPage, AuthModal } from './components/Pages';
import { Avatar, GradeBadge } from './components/Avatar';

import './styles/index.css';

// ─── Initial state ─────────────────────────────────────────────────────────────
const INIT: GameState = {
  screen: 'home', mySocketId: null, myName: '',
  roomId: null, roomState: 'waiting', roomMode: 'normal', levelFilter: 'all',
  players: [], countdown: null, problem: null, startTime: null,
  durationSeconds: 840, round: 1, totalRounds: 1,
  runResults: null, submitResult: null, endData: null,
  isRunning: false, isSubmitting: false, chat: [],
};

export default function App() {
  const { user, token, loading } = useAuth();
  const [gs,           setGs]           = useState<GameState>(INIT);
  const [page,         setPage]         = useState<AppPage>('arena');
  const [connected,    setConnected]    = useState(false);
  const [homeError,    setHomeError]    = useState<string | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [invite,       setInvite]       = useState<GameInvitePayload | null>(null);
  const [revenge,      setRevenge]      = useState<RevengePayload | null>(null);
  const [canRevenge,   setCanRevenge]   = useState(false);
  const [showAuth,     setShowAuth]     = useState(false);
  const [showReport,   setShowReport]   = useState(false);

  // Remember last mode/level for Play Again
  const lastMode  = useRef<GameMode>('normal');
  const lastLevel = useRef<LevelFilter>('all');
  const gsRef     = useRef(gs);

  useEffect(() => { gsRef.current = gs; }, [gs]);
  const patch = useCallback((p: Partial<GameState>) =>
    setGs(s => ({ ...s, ...p })), []);

  // ─── Socket listeners — attached ONCE ──────────────────────────────────────
  useEffect(() => {
    socket.on('connect', () => {
      setConnected(true);
      setHomeError(null);
      patch({ mySocketId: socket.id ?? null });
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      patch({ isRunning: false, isSubmitting: false });
      if (reason !== 'io client disconnect' && gsRef.current.screen !== 'home') {
        setHomeError('Connexion perdue — reconnexion en cours…');
      }
    });

    socket.on('connect_error', () => {
      if (gsRef.current.screen === 'lobby' || gsRef.current.screen === 'home') {
        setHomeError('Impossible de contacter le serveur — vérifie ta connexion.');
        patch({ screen: 'home' });
      }
    });

    socket.on('room_created', (p: { roomId: string }) => patch({ roomId: p.roomId }));

    socket.on('lobby_update', (p: LobbyUpdatePayload) => {
      patch({
        roomId: p.roomId, players: p.players,
        roomState: p.state, roomMode: p.mode,
        levelFilter: p.levelFilter,
        countdown: p.countdown ?? null,
        screen: 'lobby',
      });
    });

    socket.on('game_start', (p: GameStartPayload) => {
      setPointsEarned(null);
      setCanRevenge(false);
      setRevenge(null);
      patch({
        screen: 'game',
        problem: p.problem,
        players: p.players,
        startTime: p.startTime,
        durationSeconds: p.durationSeconds,
        roomMode: p.mode,
        round: p.round,
        totalRounds: p.totalRounds,
        runResults: null,
        submitResult: null,
        isRunning: false,
        isSubmitting: false,
        chat: [],
      });
    });

    socket.on('player_update', (p: PlayerUpdatePayload) => patch({ players: p.players }));
    socket.on('run_result',    (p: RunResultPayload)    => patch({ runResults: p, isRunning: false }));

    socket.on('submit_result', (p: SubmitResultPayload) => {
      if (p.passed && p.pointsEarned !== undefined) setPointsEarned(p.pointsEarned);
      patch({ submitResult: p, isSubmitting: false });
    });

    socket.on('game_end', (p: GameEndPayload) => {
      if (!gsRef.current.submitResult?.passed) setPointsEarned(0);
      setCanRevenge(true);
      patch({ screen: 'podium', endData: p, isRunning: false, isSubmitting: false });
    });

    socket.on('chat_message', (p: ChatMessagePayload) => {
      setGs(s => ({ ...s, chat: [...s.chat, p] }));
    });

    socket.on('game_invite',      (p: GameInvitePayload) => setInvite(p));
    socket.on('revenge_challenge', (p: RevengePayload)   => setRevenge(p));
    socket.on('report_received',   () => { /* acknowledgement */ });

    socket.on('error', (p: { message: string }) => {
      patch({ isRunning: false, isSubmitting: false });
      const screen = gsRef.current.screen;
      if (screen === 'home' || screen === 'lobby') {
        setHomeError(p.message);
        patch({ screen: 'home' });
      } else if (screen === 'game') {
        patch({ submitResult: { results: [], passed: false, rank: null, timeMs: 0, error: p.message } });
      }
    });

    return () => { socket.offAny(); };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!loading) { socket.auth = { token: token ?? null }; }
  }, [token, loading]);

  // ─── Full reset ─────────────────────────────────────────────────────────────
  const fullReset = useCallback(() => {
    setGs({ ...INIT });
    setHomeError(null);
    setPointsEarned(null);
    setCanRevenge(false);
    setRevenge(null);
    setInvite(null);
  }, []);

  // ─── Leave (from lobby or podium Leave button) ──────────────────────────────
  const handleLeave = useCallback(() => {
    if (socket.connected) socket.emit('leave_room');
    disconnectSocket();
    fullReset();
    setConnected(false);
    setPage('arena');
  }, [fullReset]);

  // ─── Quit (from INSIDE the game) ────────────────────────────────────────────
  const handleQuitGame = useCallback(() => {
    if (socket.connected) socket.emit('quit_game');
    disconnectSocket();
    fullReset();
    setConnected(false);
    setPage('arena');
  }, [fullReset]);

  // ─── Play Again → rejoin lobby with SAME mode ───────────────────────────────
  const handlePlayAgain = useCallback(() => {
    const mode  = lastMode.current;
    const level = lastLevel.current;
    const name  = user?.username || gsRef.current.myName || 'Anonymous';

    if (socket.connected) socket.emit('leave_room');
    disconnectSocket();
    setConnected(false);
    fullReset();

    // Reconnect and join lobby with same mode
    connectSocket(token);
    patch({ myName: name, players: [], chat: [], countdown: null, screen: 'lobby' });
    setPage('arena');

    const doJoin = () => {
      patch({ mySocketId: socket.id ?? null });
      socket.emit('join_lobby', { playerName: name, mode, levelFilter: level });
    };

    if (socket.connected) { doJoin(); }
    else { socket.once('connect', doJoin); }
  }, [user, token, patch, fullReset]);

  // ─── Ensure connected ───────────────────────────────────────────────────────
  const ensureConnected = useCallback((name: string, cb: () => void) => {
    patch({ myName: name, players: [], chat: [], countdown: null, runResults: null, submitResult: null });
    setHomeError(null);
    connectSocket(token);

    if (socket.connected) {
      patch({ mySocketId: socket.id ?? null, screen: 'lobby' });
      cb();
    } else {
      const onConnect = () => {
        patch({ mySocketId: socket.id ?? null, screen: 'lobby' });
        cb();
        socket.off('connect_error', onError);
      };
      const onError = () => {
        socket.off('connect', onConnect);
        setHomeError('Impossible de contacter le serveur. Vérifie ta connexion.');
        patch({ screen: 'home' });
      };
      socket.once('connect', onConnect);
      socket.once('connect_error', onError);
    }
  }, [patch, token]);

  // ─── Game actions ────────────────────────────────────────────────────────────
  const handleQuickMatch = useCallback((name: string, mode: GameMode, level: LevelFilter) => {
    lastMode.current  = mode;
    lastLevel.current = level;
    setPage('arena');
    ensureConnected(name, () => socket.emit('join_lobby', { playerName: name, mode, levelFilter: level }));
  }, [ensureConnected]);

  const handleCreateRoom = useCallback((name: string, mode: GameMode, level: LevelFilter) => {
    lastMode.current  = mode;
    lastLevel.current = level;
    setPage('arena');
    ensureConnected(name, () => socket.emit('create_room', { playerName: name, mode, levelFilter: level }));
  }, [ensureConnected]);

  const handleJoinByCode = useCallback((name: string, code: string) => {
    setPage('arena');
    ensureConnected(name, () => socket.emit('join_lobby', { playerName: name, roomCode: code }));
  }, [ensureConnected]);

  // ─── Practice: solo game with a specific problem ─────────────────────────────
  const handlePractice = useCallback((problem: ProblemPublic) => {
    const name = user?.username || 'Anonymous';
    lastMode.current  = 'normal';
    lastLevel.current = 'all';
    setPage('arena');
    ensureConnected(name, () => {
      socket.emit('join_lobby', {
        playerName:      name,
        mode:            'normal' as GameMode,
        levelFilter:     'all' as LevelFilter,
        forcedProblemId: problem.id,
        soloMode:        true,
      });
    });
  }, [user, ensureConnected]);

  const handleReady  = useCallback(() => socket.emit('player_ready'), []);

  const handleRun = useCallback((code: string, language: Language) => {
    if (gsRef.current.isRunning || gsRef.current.isSubmitting) return;
    patch({ isRunning: true, runResults: null });
    socket.emit('run_tests', { code, language });
  }, [patch]);

  const handleSubmit = useCallback((code: string, language: Language) => {
    if (gsRef.current.isRunning || gsRef.current.isSubmitting) return;
    if (gsRef.current.submitResult?.passed) return;
    patch({ isSubmitting: true, submitResult: null, runResults: null });
    socket.emit('submit_code', { code, language });
  }, [patch]);

  const handleChat = useCallback((text: string) => {
    socket.emit('chat_message', { text });
  }, []);

  const handleRevenge = useCallback(() => {
    if (!revenge) return;
    const name = user?.username || gsRef.current.myName || 'Anonymous';
    if (revenge.roomId) handleJoinByCode(name, revenge.roomId);
    setRevenge(null);
  }, [revenge, user, handleJoinByCode]);

  const handleNav = useCallback((p: string) => setPage(p as AppPage), []);

  const acceptInvite = useCallback(() => {
    if (!invite) return;
    const name = user?.username || gsRef.current.myName || 'Anonymous';
    handleJoinByCode(name, invite.roomId);
    setInvite(null);
  }, [invite, user, handleJoinByCode]);

  const handleSubmitReport = useCallback(async (type: 'bug' | 'problem', message: string, context?: string) => {
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          ...(localStorage.getItem('aa_token') ? { Authorization: `Bearer ${localStorage.getItem('aa_token')}` } : {}) },
        body: JSON.stringify({ type, message, context }),
      });
    } catch { /* ignore */ }
    setShowReport(false);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
        <div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>
      </div>
    );
  }

  const inGame = gs.screen !== 'home' && page === 'arena';
  const navLinks: Array<{ id: AppPage; label: string }> = [
    { id: 'arena',       label: 'Arène' },
    { id: 'library',     label: 'Bibliothèque' },
    { id: 'leaderboard', label: 'Classement' },
    { id: 'submit',      label: 'Ajouter un exercice' },
    ...(user?.isAdmin ? [{ id: 'admin' as AppPage, label: 'Admin' }] : []),
  ];

  return (
    <div className="app">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="topnav">
        <div className="topnav-inner">
          <div className="logo" onClick={() => { if (!inGame) { setPage('arena'); handleLeave(); } }}>
            <span className="logo-algo">Arène</span><span className="logo-arena">duCode</span>
            <span className="logo-cur" />
          </div>
          <div className="nav-center">
            {navLinks.map(l => (
              <button key={l.id} className={`nav-link ${page === l.id ? 'active' : ''}`}
                onClick={() => setPage(l.id)}>{l.label}</button>
            ))}
          </div>
          <div className="nav-right">
            {connected && gs.screen !== 'home' && <div className="live-pip" title="Connected" />}

            {user ? (
              <div style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}
                onClick={() => setPage('profile')}>
                <Avatar avatar={user.avatar} username={user.username} size={28} grade={user.grade} />
                <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                  <span style={{ fontSize:12, fontWeight:600, lineHeight:1 }}>{user.username}</span>
                  <GradeBadge grade={user.grade} size="sm" showIcon={false} />
                </div>
                {user.streak > 1 && <span className="streak-badge" style={{ fontSize:10, padding:'2px 7px' }}>🔥 {user.streak}</span>}
              </div>
            ) : (
              <button className="btn btn-outline btn-sm" onClick={() => setShowAuth(true)}>Connexion</button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Page area ────────────────────────────────────────────────────────── */}
      <div className="page-area">
        {page === 'arena' && (
          <>
            <div className={`screen ${gs.screen === 'home'   ? 'active' : ''}`}>
              <HomeScreen onQuickMatch={handleQuickMatch} onCreateRoom={handleCreateRoom}
                onJoinByCode={handleJoinByCode} onNavigate={handleNav} errorMessage={homeError} />
            </div>

            <div className={`screen ${gs.screen === 'lobby'  ? 'active' : ''}`}>
              <LobbyScreen roomId={gs.roomId} mode={gs.roomMode} players={gs.players}
                state={gs.roomState} countdown={gs.countdown} mySocketId={gs.mySocketId}
                onReady={handleReady} onLeave={handleLeave} />
            </div>

            <div className={`screen ${gs.screen === 'game'   ? 'active' : ''}`}>
              {gs.problem && gs.startTime !== null && (
                <GameScreen
                  key={`${gs.problem.id}-r${gs.round}`}
                  mySocketId={gs.mySocketId} problem={gs.problem} players={gs.players}
                  startTime={gs.startTime} durationSeconds={gs.durationSeconds}
                  mode={gs.roomMode} round={gs.round} totalRounds={gs.totalRounds}
                  runResults={gs.runResults} submitResult={gs.submitResult}
                  isRunning={gs.isRunning} isSubmitting={gs.isSubmitting} chat={gs.chat}
                  onRun={handleRun} onSubmit={handleSubmit} onChat={handleChat}
                  onQuit={handleQuitGame} onReport={() => setShowReport(true)} />
              )}
            </div>

            <div className={`screen ${gs.screen === 'podium' ? 'active' : ''}`}>
              {gs.endData && (
                <PodiumScreen mySocketId={gs.mySocketId} endData={gs.endData}
                  pointsEarned={pointsEarned} onPlayAgain={handlePlayAgain}
                  onLeave={handleLeave} canRevenge={canRevenge} onRevenge={handleRevenge} />
              )}
            </div>
          </>
        )}

        {page === 'library'     && <div className="screen active"><ProblemLibrary  onNavigate={handleNav} onPractice={handlePractice} /></div>}
        {page === 'leaderboard' && <div className="screen active"><LeaderboardPage /></div>}
        {page === 'profile'     && <div className="screen active"><ProfilePage     onNavigate={handleNav} /></div>}
        {page === 'submit'      && <div className="screen active"><SubmitProblemPage onNavigate={handleNav} /></div>}
        {page === 'admin'       && <div className="screen active"><AdminPage       onNavigate={handleNav} /></div>}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Report modal */}
      {showReport && <ReportModal onClose={() => setShowReport(false)} onSubmit={handleSubmitReport}
        context={gs.problem?.id ?? gs.roomId ?? undefined} />}

      {invite && (
        <div className="invite-toast">
          <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>🎮 {invite.fromName} t'invite à jouer</div>
          <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:10 }}>Mode: {invite.mode}</div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary btn-sm" onClick={acceptInvite}>Rejoindre</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setInvite(null)}>Ignorer</button>
          </div>
        </div>
      )}

      {revenge && (
        <div className="invite-toast">
          <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>😈 Défi de revanche !</div>
          <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:10 }}>{revenge.fromName} veut une revanche</div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-danger btn-sm" onClick={handleRevenge}>Accepter</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setRevenge(null)}>Ignorer</button>
          </div>
        </div>
      )}

      {!connected && gs.screen !== 'home' && gs.screen !== 'podium' && (
        <div className="disconnected">● Reconnexion en cours…</div>
      )}
    </div>
  );
}

// ─── Report Modal ────────────────────────────────────────────────────────────
function ReportModal({ onClose, onSubmit, context }: {
  onClose: () => void;
  onSubmit: (type: 'bug' | 'problem', message: string, context?: string) => void;
  context?: string;
}) {
  const [type,    setType]    = useState<'bug'|'problem'>('bug');
  const [message, setMessage] = useState('');
  const [sent,    setSent]    = useState(false);

  const submit = () => {
    if (message.trim().length < 5) return;
    onSubmit(type, message.trim(), context);
    setSent(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:300,
      display:'flex', alignItems:'center', justifyContent:'center',
    }} onClick={onClose}>
      <div style={{
        background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)',
        padding:28, width:420, maxWidth:'90vw',
      }} onClick={e => e.stopPropagation()}>
        {sent ? (
          <div style={{ textAlign:'center', padding:'20px 0', fontSize:14, color:'var(--green)' }}>
            ✓ Signalement envoyé — merci !
          </div>
        ) : (
          <>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>🚩 Signalement</div>

            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {(['bug','problem'] as const).map(t => (
                <button key={t} className={`btn btn-sm ${type===t?'btn-primary':'btn-ghost'}`}
                  onClick={() => setType(t)}>
                  {t === 'bug' ? '🐛 Bug' : '📝 Problème dans l\'exercice'}
                </button>
              ))}
            </div>

            <textarea
              style={{
                width:'100%', minHeight:100, background:'var(--bg-2)', color:'var(--text)',
                border:'1px solid var(--border)', borderRadius:'var(--r-sm)',
                padding:'10px 12px', fontSize:13, fontFamily:'var(--font)',
                resize:'vertical', outline:'none', boxSizing:'border-box',
              }}
              placeholder={type === 'bug' ? 'Décris le bug — ce qui s\'est passé, ce que tu attendais…' : 'Décris le problème avec cet exercice…'}
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={2000}
            />
            {context && (
              <div style={{ fontSize:10, color:'var(--text-3)', marginTop:4 }}>Context: {context}</div>
            )}

            <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary btn-sm" onClick={submit}
                disabled={message.trim().length < 5}>
                Envoyer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
