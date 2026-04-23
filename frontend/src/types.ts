export type Language    = 'c' | 'python' | 'ocaml';
export type RoomState   = 'waiting' | 'countdown' | 'playing' | 'finished';
export type GameMode    = 'normal'|'best_of_5'|'panic'|'buggy_code'|'sudden_death'|'hyper_rush'|'battle_royale'|'team_2v2'|'king_of_hill'|'duel_1v1'|'optimization'|'duel_streak';
export type LevelFilter = 'pre_bac' | 'post_bac' | 'bac_nsi' | 'all';
export type Screen      = 'home'|'lobby'|'game'|'podium';
export type AppPage     = 'arena'|'library'|'leaderboard'|'profile'|'admin'|'submit';

export interface Grade {
  name:        string;
  tier:        string;
  color:       string;
  bg?:         string;  // subtle background color
  glow:        string;
  icon:        string;
  rarity?:     string;
  lp?:         number;
  topPercent?: number;
}

export interface UserProfile {
  id:           string;
  username:     string;
  avatar:       string | null;
  establishment:string;
  level:        'pre_bac' | 'post_bac';
  totalPoints:  number;
  weeklyPoints: number;
  gamesPlayed:  number;
  gamesWon:     number;
  streak:       number;
  clanId:       string | null;
  isAdmin:      boolean;
  grade:        Grade;
}

export interface PlayerPublic {
  id:           string;
  userId:       string | null;
  name:         string;
  avatar:       string | null;
  establishment:string;
  level:        'pre_bac' | 'post_bac';
  grade:        Grade | null;
  ready:        boolean;
  isBot:        boolean;
  rank:         number | null;
  finishTime:   number | null;
  language:     Language | null;
  sessionScore: number;
  teamId:       number | null;
  eliminated:   boolean;
}

export interface TestCase  { input: string; output: string }
export interface TestResult {
  testIndex: number;
  passed:    boolean;
  expected:  string;
  got:       string;
  error?:    string;
  time?:     number;
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
  category?:     string;
  isBuggyCode?:  boolean;
  buggyCode?:    Record<string, string> | null;
}

// ── Socket payloads ────────────────────────────────────────────────────────────
export interface LobbyUpdatePayload {
  roomId: string; mode: GameMode; levelFilter: LevelFilter;
  players: PlayerPublic[]; state: RoomState; countdown?: number;
}
export interface GameStartPayload {
  problem: ProblemPublic; players: PlayerPublic[];
  startTime: number; durationSeconds: number;
  mode: GameMode; round: number; totalRounds: number;
}
export interface PlayerUpdatePayload { players: PlayerPublic[] }
export interface RunResultPayload    { results: TestResult[]; totalTests: number; passedTests: number; timeMs: number }
export interface SubmitResultPayload { results: TestResult[]; passed: boolean; rank: number|null; timeMs: number; pointsEarned?: number; error?: string; complexity?: { time: string; space: string; notes: string }; lpDelta?: number; }
export interface GameEndPayload      { players: PlayerPublic[]; codes: Record<string,{code:string;language:Language}|null>; round:number; totalRounds:number; modeOver:boolean }
export interface ChatMessagePayload  { id:string; socketId:string; name:string; avatar:string|null; text:string; timestamp:number }
export interface GameInvitePayload   { fromName:string; roomId:string; mode:GameMode }
export interface RevengePayload      { fromName:string; fromId:string; mode:GameMode; roomId?:string }

// ── App state ─────────────────────────────────────────────────────────────────
export interface GameState {
  screen:          Screen;
  mySocketId:      string | null;
  myName:          string;
  roomId:          string | null;
  roomState:       RoomState;
  roomMode:        GameMode;
  levelFilter:     LevelFilter;
  players:         PlayerPublic[];
  countdown:       number | null;
  problem:         ProblemPublic | null;
  startTime:       number | null;
  durationSeconds: number;
  round:           number;
  totalRounds:     number;
  runResults:      RunResultPayload | null;
  submitResult:    SubmitResultPayload | null;
  endData:         GameEndPayload | null;
  isRunning:       boolean;
  isSubmitting:    boolean;
  chat:            ChatMessagePayload[];
}

export const DEFAULT_TEMPLATES: Record<Language, string> = {
  c:`#include <stdio.h>
#include <stdbool.h>
#include <math.h>

int main() {
    /* TODO: read input with scanf, write with printf */
    return 0;
}`,
  python:`import sys

# TODO: implement your solution
# Read: input() or sys.stdin.read()
# Write: print(...)
`,
  ocaml:`(* TODO: implement your solution *)
let () =
  (* Read with Scanf.scanf, write with print_string / Printf.printf *)
  ()
`,
};

export const MODE_LABELS: Partial<Record<GameMode, string>> & Record<string,string> = {
  normal:        'Standard',
  best_of_5:     '5 Manches',
  panic:         'Panique !',
  buggy_code:    'Trouve le Bug',
  sudden_death:  'Mort Subite',
  hyper_rush:    'Sprint',
  battle_royale: 'Battle Royale',
  team_2v2:      '2 contre 2',
  king_of_hill:  'Sur le Trône',
  duel_1v1:      'Duel 1v1',
  optimization:   'Au Plus Malin',
  duel_streak:    'Série de Duels',
};

export const MODE_DESCS: Partial<Record<GameMode, string>> & Record<string,string> = {
  normal:        '14 minutes pour coder. Qui finit le premier ?',
  best_of_5:     '5 manches, le plus de victoires l\'emporte',
  panic:         '30 secondes. Aucune hésitation permise.',
  buggy_code:    'Un bug se cache dans le code. Débusque-le.',
  sudden_death:  'Une seule chance de soumettre — fais-la compter',
  hyper_rush:    '3 manches, chronomètre qui fond à chaque fois',
  battle_royale: '10 codeurs entrent, un seul sort vainqueur',
  team_2v2:      'Deux équipes de deux, la première à finir gagne',
  king_of_hill:  'Le champion reste jusqu\'à sa défaite',
  duel_1v1:      'Face à face — le perdant cède ses LP',
  optimization:   'Passer les tests ne suffit pas — vise la meilleure complexité',
  duel_streak:    'Trois duels consécutifs, qui tient jusqu\'au bout ?',
};

export const MODE_POINTS: Record<string,number> = {
  normal:100, best_of_5:150, panic:120, buggy_code:130,
  sudden_death:150, hyper_rush:140, battle_royale:200, team_2v2:130, king_of_hill:160,
};
