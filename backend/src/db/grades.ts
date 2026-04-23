// ─── LP-based rank system ─────────────────────────────────────────────────────
// Each division has exactly 100 LP.
// Placement (5 games) → max Platinum I.
// LP per win/loss varies by problem difficulty.

export interface RankTier {
  tier:     'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Legend';
  division: 'III' | 'II' | 'I' | '';
  color:    string;
  bg:       string;    // subtle background
  glow:     string;
  icon:     string;    // emoji
}

export const TIERS: RankTier[] = [
  { tier:'Bronze',   division:'III', color:'#C77B30', bg:'rgba(199,123,48,0.12)',  glow:'rgba(199,123,48,0.35)', icon:'🥉' },
  { tier:'Bronze',   division:'II',  color:'#D4884A', bg:'rgba(212,136,74,0.12)',  glow:'rgba(212,136,74,0.35)', icon:'🥉' },
  { tier:'Bronze',   division:'I',   color:'#E09060', bg:'rgba(224,144,96,0.12)',  glow:'rgba(224,144,96,0.35)', icon:'🥉' },
  { tier:'Silver',   division:'III', color:'#9BAAB8', bg:'rgba(155,170,184,0.12)', glow:'rgba(155,170,184,0.3)', icon:'🥈' },
  { tier:'Silver',   division:'II',  color:'#B0BEC8', bg:'rgba(176,190,200,0.12)', glow:'rgba(176,190,200,0.3)', icon:'🥈' },
  { tier:'Silver',   division:'I',   color:'#C8D6E0', bg:'rgba(200,214,224,0.12)', glow:'rgba(200,214,224,0.3)', icon:'🥈' },
  { tier:'Gold',     division:'III', color:'#E8B920', bg:'rgba(232,185,32,0.12)',  glow:'rgba(232,185,32,0.35)', icon:'🥇' },
  { tier:'Gold',     division:'II',  color:'#F0C830', bg:'rgba(240,200,48,0.12)',  glow:'rgba(240,200,48,0.35)', icon:'🥇' },
  { tier:'Gold',     division:'I',   color:'#FFD84D', bg:'rgba(255,216,77,0.12)',  glow:'rgba(255,216,77,0.35)', icon:'🥇' },
  { tier:'Platinum', division:'III', color:'#22D3EE', bg:'rgba(34,211,238,0.10)',  glow:'rgba(34,211,238,0.3)',  icon:'💠' },
  { tier:'Platinum', division:'II',  color:'#38BDF8', bg:'rgba(56,189,248,0.10)',  glow:'rgba(56,189,248,0.3)',  icon:'💠' },
  { tier:'Platinum', division:'I',   color:'#7DD3FC', bg:'rgba(125,211,252,0.10)', glow:'rgba(125,211,252,0.3)', icon:'💠' },
  { tier:'Diamond',  division:'III', color:'#A78BFA', bg:'rgba(167,139,250,0.10)', glow:'rgba(167,139,250,0.35)','icon':'💎' },
  { tier:'Diamond',  division:'II',  color:'#C084FC', bg:'rgba(192,132,252,0.10)', glow:'rgba(192,132,252,0.35)','icon':'💎' },
  { tier:'Diamond',  division:'I',   color:'#E879F9', bg:'rgba(232,121,249,0.10)', glow:'rgba(232,121,249,0.35)','icon':'💎' },
  { tier:'Master',   division:'',    color:'#F43F5E', bg:'rgba(244,63,94,0.12)',   glow:'rgba(244,63,94,0.4)',   icon:'👑' },
  { tier:'Legend',   division:'',    color:'#F59E0B', bg:'rgba(245,158,11,0.12)',  glow:'rgba(245,158,11,0.4)',  icon:'⚡' },
];

/** LP thresholds: index in TIERS × 100 */
export const LP_PER_DIVISION = 100;

// LP gains/losses by problem difficulty
export const LP_TABLE = {
  pre_bac:  { win: 25, loss: -15 },
  post_bac: { win: 40, loss: -20 },
  easy:     { win: 15, loss: -10 },  // future difficulties
  hard:     { win: 60, loss: -25 },
};

// Performance bonuses
export const LP_BONUSES = {
  first_solve:  5,   // finished #1
  zero_errors:  5,   // submitted and passed on first try
  fastest:      5,   // fastest time in lobby
};

export interface PlayerRank {
  tier:        RankTier['tier'];
  division:    string;
  lp:          number;    // 0–99
  totalLp:     number;    // absolute LP (tier_index × 100 + lp)
  displayName: string;    // "Gold II — 73 LP"
  color:       string;
  bg:          string;
  glow:        string;
  icon:        string;
  tierIndex:   number;    // 0-16, index in TIERS
  topPercent:  number;    // approximate top %
}

export function getPlayerRank(totalLp: number): PlayerRank {
  const clampedLp = Math.max(0, totalLp);
  const tierIndex = Math.min(TIERS.length - 1, Math.floor(clampedLp / LP_PER_DIVISION));
  const t         = TIERS[tierIndex];
  const lp        = clampedLp % LP_PER_DIVISION;
  const div       = t.division ? ` ${t.division}` : '';
  const topPct    = Math.max(1, Math.round(100 - (tierIndex / (TIERS.length - 1)) * 99));

  return {
    tier:        t.tier,
    division:    t.division,
    lp,
    totalLp:     clampedLp,
    displayName: `${t.tier}${div}`,
    color:       t.color,
    bg:          t.bg,
    glow:        t.glow,
    icon:        t.icon,
    tierIndex,
    topPercent:  topPct,
  };
}

export function getLpProgress(totalLp: number): number {
  if (totalLp >= TIERS.length * LP_PER_DIVISION - 1) return 100;
  return totalLp % LP_PER_DIVISION;
}

// ─── LP delta calculation ──────────────────────────────────────────────────────

export interface LpDelta {
  base:         number;   // win/loss base
  bonuses:      { label: string; value: number }[];
  total:        number;
  newTotalLp:   number;
  promotedTo?:  string;
  demotedFrom?: string;
}

export function calcLpDelta(
  currentLp: number,
  won:        boolean,
  isFirstSolve: boolean,
  zeroErrors:   boolean,
  isFastest:    boolean,
  difficulty:   'pre_bac' | 'post_bac'
): LpDelta {
  const table  = LP_TABLE[difficulty];
  const base   = won ? table.win : table.loss;
  const bonuses: { label: string; value: number }[] = [];

  if (won) {
    if (isFirstSolve) bonuses.push({ label: 'First Solve', value: LP_BONUSES.first_solve });
    if (zeroErrors)   bonuses.push({ label: 'Zero Errors', value: LP_BONUSES.zero_errors });
    if (isFastest)    bonuses.push({ label: 'Fastest',     value: LP_BONUSES.fastest });
  }

  const bonusTotal = bonuses.reduce((s, b) => s + b.value, 0);
  const total      = base + bonusTotal;
  const newTotalLp = Math.max(0, currentLp + total);

  const oldTier = Math.floor(currentLp / LP_PER_DIVISION);
  const newTier = Math.floor(newTotalLp / LP_PER_DIVISION);

  let promotedTo:  string | undefined;
  let demotedFrom: string | undefined;

  if (newTier > oldTier && newTier < TIERS.length) {
    const t = TIERS[newTier];
    promotedTo = `${t.tier}${t.division ? ' ' + t.division : ''}`;
  } else if (newTier < oldTier) {
    const t = TIERS[oldTier];
    demotedFrom = `${t.tier}${t.division ? ' ' + t.division : ''}`;
  }

  return { base, bonuses, total, newTotalLp, promotedTo, demotedFrom };
}

// ─── Modes LP multipliers ──────────────────────────────────────────────────────
export const MODE_LP_MULTIPLIER: Record<string, number> = {
  normal:        1.0,
  best_of_5:     1.2,
  panic:         1.0,
  buggy_code:    1.1,
  sudden_death:  1.3,
  hyper_rush:    1.1,
  battle_royale: 1.5,
  team_2v2:      1.1,
  king_of_hill:  1.2,
  duel_1v1:      1.4,
  optimization:   1.6,   // hardest — best complexity wins
  duel_streak:    1.5,
};

// ─── Badge definitions ────────────────────────────────────────────────────────

export interface Badge {
  id:          string;
  name:        string;
  description: string;
  icon:        string;
  color:       string;
  category:    'activity' | 'skill' | 'language' | 'rank' | 'special';
  rarity:      'common' | 'rare' | 'epic' | 'legendary';
}

export const BADGES: Badge[] = [
  // Activity
  { id:'hello_world', name:'Hello World',    description:'First victory',                  icon:'👋', color:'#22C55E', category:'activity', rarity:'common' },
  { id:'commit',      name:'Commit',         description:'10 games played',                icon:'📦', color:'#3B82F6', category:'activity', rarity:'common' },
  { id:'uptime',      name:'Uptime',         description:'7-day streak',                   icon:'⚡', color:'#F59E0B', category:'activity', rarity:'common' },
  { id:'stack_overflow', name:'Stack Overflow', description:'100 games played',            icon:'📚', color:'#F97316', category:'activity', rarity:'rare'   },
  // Skill
  { id:'clean_run',   name:'Clean Run',      description:'Win without errors',             icon:'✅', color:'#22C55E', category:'skill',    rarity:'common' },
  { id:'first_try',   name:'First Try',      description:'Pass on first submit',           icon:'🎯', color:'#3B82F6', category:'skill',    rarity:'common' },
  { id:'low_latency', name:'Low Latency',    description:'Win in under 60s',               icon:'🔥', color:'#F59E0B', category:'skill',    rarity:'rare'   },
  { id:'clutch',      name:'Clutch Mode',    description:'Win with < 10s left',            icon:'😤', color:'#EF4444', category:'skill',    rarity:'rare'   },
  { id:'complexity',  name:'O(log n)',       description:'Submit an O(log n) solution',    icon:'📈', color:'#A855F7', category:'skill',    rarity:'epic'   },
  // Language
  { id:'pointer',     name:'Pointer',        description:'25 wins in C',                   icon:'⚙️',  color:'#22C55E', category:'language', rarity:'common' },
  { id:'scripter',    name:'Scripter',       description:'25 wins in Python',              icon:'🐍', color:'#F59E0B', category:'language', rarity:'common' },
  { id:'functional',  name:'Functional',     description:'15 wins in OCaml',               icon:'λ',  color:'#F97316', category:'language', rarity:'rare'   },
  { id:'polyglot',    name:'Polyglot',       description:'Win with 3 different languages', icon:'🌍', color:'#A855F7', category:'language', rarity:'epic'   },
  // Rank
  { id:'silver_unlock',  name:'Silver Unlocked',  description:'Reached Silver',  icon:'🥈', color:'#C0C0C0', category:'rank', rarity:'common' },
  { id:'gold_unlock',    name:'Gold Unlocked',    description:'Reached Gold',    icon:'🥇', color:'#FFD700', category:'rank', rarity:'common' },
  { id:'diamond_unlock', name:'Diamond Unlocked', description:'Reached Diamond', icon:'💎', color:'#A78BFA', category:'rank', rarity:'rare'   },
  { id:'mastermind',     name:'Mastermind',       description:'Reached Master',  icon:'👑', color:'#F43F5E', category:'rank', rarity:'epic'   },
  { id:'legendary',      name:'Legendary',        description:'Reached Legend',  icon:'⚡', color:'#F59E0B', category:'rank', rarity:'legendary' },
  // Special
  { id:'night_shift',   name:'Night Shift',    description:'Win between 2–5am',          icon:'🌙', color:'#6366F1', category:'special', rarity:'rare'      },
  { id:'reverse_sweep', name:'Reverse Sweep',  description:'3 wins after a loss streak', icon:'🔄', color:'#EF4444', category:'special', rarity:'epic'      },
  { id:'stable_build',  name:'Stable Build',   description:'10 wins without leaving',    icon:'🏗️', color:'#22C55E', category:'special', rarity:'rare'      },
  { id:'duel_champion', name:'Duel Champion',  description:'Win 10 1v1 duels',           icon:'⚔️',  color:'#F59E0B', category:'special', rarity:'epic'      },
  { id:'revenge',       name:'Revenge',        description:'Win a revenge match',        icon:'😈', color:'#EF4444', category:'special', rarity:'common'    },
];

export function checkBadgeUnlock(
  existing:   string[],
  stats: { gamesPlayed:number; wins:number; streakDays:number; cWins:number; pyWins:number; mlWins:number; winsByLang:Set<string>; lp:number; hourOfDay:number; prevLossStreak:number; stableWins:number; duelWins:number; hadRevenge:boolean; fastestWin:boolean; cleanRun:boolean; clutchWin:boolean; complexity:string }
): string[] {
  const unlocked: string[] = [];
  const has = (id: string) => existing.includes(id) || unlocked.includes(id);
  const add = (id: string) => { if (!has(id)) unlocked.push(id); };

  if (stats.wins >= 1)   add('hello_world');
  if (stats.gamesPlayed >= 10)  add('commit');
  if (stats.streakDays >= 7)    add('uptime');
  if (stats.gamesPlayed >= 100) add('stack_overflow');
  if (stats.cleanRun)           add('clean_run');
  if (stats.fastestWin)         add('first_try');
  if (stats.fastestWin && stats.wins > 0)   add('low_latency');
  if (stats.clutchWin)          add('clutch');
  if (stats.complexity.includes('log'))    add('complexity');
  if (stats.cWins  >= 25)       add('pointer');
  if (stats.pyWins >= 25)       add('scripter');
  if (stats.mlWins >= 15)       add('functional');
  if (stats.winsByLang.size >= 3) add('polyglot');
  if (stats.lp >= 300)  add('silver_unlock');
  if (stats.lp >= 700)  add('gold_unlock');
  if (stats.lp >= 1300) add('diamond_unlock');
  if (stats.lp >= 1600) add('mastermind');
  if (stats.lp >= 1700) add('legendary');
  if (stats.hourOfDay >= 2 && stats.hourOfDay <= 5) add('night_shift');
  if (stats.prevLossStreak >= 2 && stats.wins > 0)   add('reverse_sweep');
  if (stats.stableWins >= 10)   add('stable_build');
  if (stats.duelWins >= 10)     add('duel_champion');
  if (stats.hadRevenge)         add('revenge');

  return unlocked;
}

export function getDifficultyMultiplier(difficulty: 'pre_bac' | 'post_bac'): number {
  return difficulty === 'post_bac' ? 1.5 : 1.0;
}

// Legacy compat for old RANK_POINTS usage
export const RANK_POINTS: Record<string, number[]> = {
  normal:        [25, 18, 12, 7, 3],
  best_of_5:     [30, 22, 15, 8, 4],
  panic:         [25, 18, 12, 7, 3],
  buggy_code:    [28, 20, 14, 8, 3],
  sudden_death:  [35, 25, 18, 10, 5],
  hyper_rush:    [28, 20, 14, 8, 3],
  battle_royale: [50, 35, 25, 18, 12, 7, 4, 2, 1, 0],
  team_2v2:      [30, 30, 8, 8],
  king_of_hill:  [35, 25, 18, 10, 5],
  duel_1v1:      [60, 0],
  optimization:   [70, 50, 35, 20, 10],
  duel_streak:    [55, 0],
};

// Legacy alias
export const getGrade = (lp: number) => getPlayerRank(lp);
