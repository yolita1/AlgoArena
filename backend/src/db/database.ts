// eslint-disable-next-line @typescript-eslint/no-require-imports
const low       = require('lowdb');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FileSync  = require('lowdb/adapters/FileSync');

import { resolve } from 'path';
import { mkdirSync, existsSync } from 'fs';

const DATA_DIR = resolve(__dirname, '../../../data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ─── Schema types ─────────────────────────────────────────────────────────────

export interface DBUser {
  id:           string;
  username:     string;
  email:        string | null;
  passwordHash: string | null; // null = guest-converted
  avatar:       string | null; // filename in /uploads
  establishment: string;       // lycée name, prépa name, uni
  level:        'pre_bac' | 'post_bac';
  totalLp:      number;  // absolute LP (tier_index * 100 + lp)
  weeklyLp:     number;
  monthlyLp:    number;
  gamesPlayed:  number;
  gamesWon:     number;
  streak:       number;        // consecutive days with a game
  lastPlayedDate: string | null;
  badges:       string[];         // unlocked badge ids
  pinnedBadges: string[];         // up to 3 pinned
  cWins:        number;
  pyWins:       number;
  mlWins:       number;
  lossStreak:   number;
  clanId:       string | null;
  banned:       boolean;
  isAdmin:      boolean;
  createdAt:    string;
}

export interface DBProblem {
  id:          string;
  title:       string;
  description: string;
  inputSpec:   string;
  outputSpec:  string;
  constraints: string;
  exampleInput: string;
  exampleOutput:string;
  difficulty:  'pre_bac' | 'post_bac' | 'bac_nsi';
  category:    string;         // 'sorting' | 'math' | 'strings' | 'graphs' | ...
  tests:       Array<{ input: string; output: string; hidden?: boolean }>;
  botCodes:    Array<{ language: string; code: string; submitDelay: number }>;
  authorId:    string | null;
  approved:    boolean;
  playCount:   number;
  isBuggyCode?: boolean;
  buggyCode?:  Record<string, string> | null;
  createdAt:   string;
}

export interface DBClan {
  id:          string;
  name:        string;
  tag:         string;
  description: string;
  leaderId:    string;
  totalLp:     number;
  weeklyLp:    number;
  memberCount: number;
  createdAt:   string;
}

export interface DBFriendship {
  id:        string;
  userId:    string;
  friendId:  string;
  status:    'pending' | 'accepted';
  createdAt: string;
}

export interface DBGameRecord {
  id:        string;
  roomId:    string;
  mode:      string;
  problemId: string;
  players:   Array<{ userId: string | null; name: string; rank: number | null; points: number; language: string | null }>;
  startedAt: string;
  endedAt:   string;
}

export interface DBReport {
  id:        string;
  type:      'bug' | 'problem';
  message:   string;
  context?:  string;
  userId:    string | null;
  username:  string | null;
  resolved:  boolean;
  createdAt: string;
}

interface Schema {
  users:       DBUser[];
  problems:    DBProblem[];
  clans:       DBClan[];
  friendships: DBFriendship[];
  games:       DBGameRecord[];
  reports:     DBReport[];
}

// ─── Init ─────────────────────────────────────────────────────────────────────

const adapter = new FileSync(resolve(DATA_DIR, 'db.json'));
const db      = low(adapter) as any; // lowdb@1 has limited TS support

db.defaults({
  users:       [],
  problems:    [],
  clans:       [],
  friendships: [],
  games:       [],
  reports:     [],
}).write();

export default db;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getUserById(id: string): DBUser | undefined {
  return db.get('users').find({ id }).value();
}

export function getUserByUsername(username: string): DBUser | undefined {
  return db.get('users').find((u: DBUser) => u.username.toLowerCase() === username.toLowerCase()).value();
}

export function getApprovedProblems(difficulty?: 'pre_bac' | 'post_bac'): DBProblem[] {
  let q = db.get('problems').filter({ approved: true });
  if (difficulty) q = q.filter({ difficulty });
  return q.value();
}

export function getProblemById(id: string): DBProblem | undefined {
  return db.get('problems').find({ id }).value();
}


export function updateUserLp(userId: string, lpDelta: number): void {
  const user = getUserById(userId);
  if (!user) return;
  const newLp = Math.max(0, (user.totalLp || 0) + lpDelta);
  db.get('users').find({ id: userId }).assign({
    totalLp:   newLp,
    weeklyLp:  Math.max(0, (user.weeklyLp  || 0) + lpDelta),
    monthlyLp: Math.max(0, (user.monthlyLp || 0) + lpDelta),
  }).write();
}
// legacy alias
export const updateUserPoints = updateUserLp;

export function updateStreak(userId: string): void {
  const user = getUserById(userId);
  if (!user) return;
  const today = new Date().toISOString().split('T')[0];
  if (user.lastPlayedDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const newStreak = user.lastPlayedDate === yesterday ? user.streak + 1 : 1;
  db.get('users').find({ id: userId }).assign({ streak: newStreak, lastPlayedDate: today }).write();
}

/** Called weekly by a cron / on server start to reset weekly points */
export function resetWeeklyPoints(): void {
  db.get('users').each((u: DBUser) => { u.weeklyLp = 0; }).write();
  db.get('clans').each((c: DBClan) => { if("weeklyLp" in c)(c as any).weeklyLp = 0; }).write();
}

export function updateClanPoints(clanId: string, pts: number): void {
  const clan = db.get('clans').find({ id: clanId }).value() as any;
  if (!clan) return;
  db.get('clans').find({ id: clanId }).assign({
    totalLp:  (clan.totalLp  || 0) + pts,
    weeklyLp: (clan.weeklyLp || 0) + pts,
  }).write();
}
