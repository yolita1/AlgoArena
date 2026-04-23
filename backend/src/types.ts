export type Language  = 'c' | 'python' | 'ocaml';
export type RoomState = 'waiting' | 'countdown' | 'playing' | 'finished';

export type GameMode =
  | 'normal'        // 14 min, standard
  | 'best_of_5'     // 5 rounds same lobby
  | 'panic'         // 30 seconds
  | 'buggy_code'    // fix the bug
  | 'sudden_death'  // one submit attempt
  | 'hyper_rush'    // 3 rounds, decreasing time
  | 'battle_royale' // 10 players, elimination
  | 'team_2v2'      // 2v2 teams
  | 'king_of_hill'
  | 'duel_1v1'
  | 'optimization'
  | 'duel_streak'; // winner stays, challengers queue

export type LevelFilter = 'pre_bac' | 'post_bac' | 'bac_nsi' | 'all';

// ─── Problem ──────────────────────────────────────────────────────────────────

export interface TestCase {
  input:  string;
  output: string;
  hidden?: boolean;
}

export interface BotCode {
  language:    Language;
  code:        string;
  submitDelay: number;
}

export interface Problem {
  id:           string;
  title:        string;
  description:  string;
  inputSpec:    string;
  outputSpec:   string;
  constraints:  string;
  exampleInput: string;
  exampleOutput:string;
  difficulty:   'pre_bac' | 'post_bac';
  category:     string;
  tests:        TestCase[];
  botCodes:     BotCode[];
}

// ─── Player / Room ────────────────────────────────────────────────────────────

export interface Player {
  socketId:     string;
  userId:       string | null;
  name:         string;
  avatar:       string | null;
  establishment:string;
  level:        'pre_bac' | 'post_bac';
  grade:        { name: string; color: string; glow: string; icon: string } | null;
  ready:        boolean;
  isBot:        boolean;
  rank:         number | null;
  finishTime:   number | null;
  code:         string | null;
  language:     Language | null;
  teamId:       number | null;    // for 2v2
  eliminated:   boolean;         // for battle royale
  attempts:     number;          // for sudden death
  complexityScore: number;       // for optimization mode (lower = better)
}

export interface Room {
  id:             string;
  type:           'public' | 'private';
  mode:           GameMode;
  levelFilter:    LevelFilter;
  state:          RoomState;
  players:        Map<string, Player>;
  problem:        Problem | null;
  startTime:      number | null;
  currentRound:   number;
  totalRounds:    number;
  roundScores:    Map<string, number>; // socketId → cumulative round wins
  countdownInterval: NodeJS.Timeout | null;
  forcedProblemId: string | null;
  botTimers:      NodeJS.Timeout[];
  gameEndTimer:   NodeJS.Timeout | null;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id:        string;
  roomId:    string;
  socketId:  string;
  name:      string;
  avatar:    string | null;
  text:      string;
  timestamp: number;
}

// ─── Execution ────────────────────────────────────────────────────────────────

export interface TestResult {
  testIndex: number;
  passed:    boolean;
  expected:  string;
  got:       string;
  error?:    string;
  time?:     number;
}

export interface RunResult {
  stdout:   string;
  stderr:   string;
  success:  boolean;
  exitCode: number;
  timeMs:   number;
  error?:   string;
}

// ─── Socket payloads (C→S) ────────────────────────────────────────────────────

export interface JoinLobbyPayload {
  playerName:     string;
  roomCode?:      string;
  mode?:          GameMode;
  levelFilter?:   LevelFilter;
  token?:         string;
  forcedProblemId?: string;   // For practice mode — pick a specific problem
  soloMode?:      boolean;    // Solo practice — fill with bots immediately, no lobby
}

export interface ReportPayload {
  type:    'bug' | 'problem';
  message: string;
  context?: string;  // problemId, roomId, etc.
}

export interface SubmitCodePayload  { code: string; language: Language }
export interface RunTestsPayload    { code: string; language: Language }
export interface RequestCodePayload { targetPlayerId: string }
export interface ChatPayload        { text: string }

// ─── Socket payloads (S→C) ────────────────────────────────────────────────────

export interface PlayerPublic {
  id:           string;
  userId:       string | null;
  name:         string;
  avatar:       string | null;
  establishment:string;
  level:        'pre_bac' | 'post_bac';
  grade:        { name: string; color: string; glow: string; icon: string } | null;
  ready:        boolean;
  isBot:        boolean;
  rank:         number | null;
  finishTime:   number | null;
  language:     Language | null;
  sessionScore: number;
  teamId:       number | null;
  eliminated:   boolean;
}

export interface LobbyUpdatePayload {
  roomId:    string;
  mode:      GameMode;
  levelFilter: LevelFilter;
  players:   PlayerPublic[];
  state:     RoomState;
  countdown?: number;
}

export interface ProblemPublic {
  id:           string;
  title:        string;
  description:  string;
  inputSpec:    string;
  outputSpec:   string;
  constraints:  string;
  exampleInput: string;
  exampleOutput:string;
  difficulty:   'pre_bac' | 'post_bac';
  visibleTests: TestCase[];
}

export interface GameStartPayload {
  problem:         ProblemPublic;
  players:         PlayerPublic[];
  startTime:       number;
  durationSeconds: number;
  mode:            GameMode;
  round:           number;
  totalRounds:     number;
}

export interface PlayerUpdatePayload { players: PlayerPublic[] }

export interface RunResultPayload {
  results:     TestResult[];
  totalTests:  number;
  passedTests: number;
  timeMs:      number;
}

export interface SubmitResultPayload {
  results:       TestResult[];
  passed:        boolean;
  rank:          number | null;
  timeMs:        number;
  pointsEarned?: number;
  error?:        string;
}

export interface GameEndPayload {
  players:      PlayerPublic[];
  codes:        { [playerId: string]: { code: string; language: Language } | null };
  round:        number;
  totalRounds:  number;
  modeOver:     boolean;  // true = all rounds done
}

export interface ChatMessagePayload {
  id:        string;
  socketId:  string;
  name:      string;
  avatar:    string | null;
  text:      string;
  timestamp: number;
}

export interface PlayerCodePayload {
  playerId:  string;
  name:      string;
  code:      string;
  language:  Language;
}

export interface ErrorPayload { message: string }
export interface RevengePayload { roomId: string; fromName: string }
