import { Router, Request, Response } from 'express';
import db, { DBUser } from '../db/database';
import { getPlayerRank } from '../db/grades';

const router = Router();

type Period = 'all' | 'weekly' | 'monthly';

router.get('/players', (req: Request, res: Response): void => {
  const { period = 'all', level, page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageN = Math.max(1, parseInt(page));
  const limitN = Math.min(100, parseInt(limit));
  const ptKey = period === 'weekly' ? 'weeklyLp' : period === 'monthly' ? 'monthlyLp' : 'totalLp';

  let users: any[] = db.get('users').filter({ banned: false }).value();
  if (level && ['pre_bac','post_bac'].includes(level)) users = users.filter((u: any) => u.level === level);
  users.sort((a: any, b: any) => ((b[ptKey]||0) - (a[ptKey]||0)));
  const total = users.length;
  const slice = users.slice((pageN-1)*limitN, pageN*limitN);
  res.json({ total, page: pageN, players: slice.map((u: any, i: number) => ({
    rank: (pageN-1)*limitN+i+1,
    id: u.id, username: u.username, avatar: u.avatar,
    establishment: u.establishment, level: u.level,
    totalPoints: u.totalLp||0, weeklyPoints: u.weeklyLp||0,
    gamesPlayed: u.gamesPlayed||0, gamesWon: u.gamesWon||0,
    streak: u.streak||0,
    grade: (() => { const r = getPlayerRank(u.totalLp||0); return { name: r.displayName, tier: r.tier, color: r.color, glow: r.glow, icon: r.icon, rarity: 'common', lp: r.lp }; })(),
  })) });
});

router.get('/establishments', (req: Request, res: Response): void => {
  const { period = 'all' } = req.query as Record<string, string>;
  const ptKey = period === 'weekly' ? 'weeklyLp' : 'totalLp';
  const users: any[] = db.get('users').filter({ banned: false }).value();
  const map = new Map<string, { totalPoints: number; members: number; topPlayers: any[] }>();
  for (const u of users) {
    const est = u.establishment || 'Inconnu';
    if (!map.has(est)) map.set(est, { totalPoints: 0, members: 0, topPlayers: [] });
    const e = map.get(est)!;
    e.totalPoints += (u[ptKey]||0);
    e.members++;
    e.topPlayers.push(u);
  }
  const sorted = [...map.entries()]
    .map(([name, data]) => ({ establishment: name, totalPoints: data.totalPoints, members: data.members, topPlayer: data.topPlayers.sort((a:any,b:any)=>((b[ptKey]||0)-(a[ptKey]||0)))[0] }))
    .sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 50);
  res.json({ total: sorted.length, establishments: sorted.map((e, i) => ({
    rank: i+1, ...e,
    topPlayer: e.topPlayer ? { username: e.topPlayer.username, avatar: e.topPlayer.avatar, grade: (() => { const r = getPlayerRank(e.topPlayer.totalLp||0); return { name: r.displayName, color: r.color }; })(), totalPoints: e.topPlayer.totalLp||0 } : null,
  })) });
});

router.get('/clans', (req: Request, res: Response): void => {
  const { period = 'all' } = req.query as Record<string, string>;
  const ptKey = period === 'weekly' ? 'weeklyLp' : 'totalLp';
  const clans: any[] = db.get('clans').value().sort((a: any, b: any) => ((b[ptKey]||b.totalPoints||0)-(a[ptKey]||a.totalPoints||0))).slice(0, 50);
  res.json({ total: clans.length, clans: clans.map((c: any, i: number) => ({ rank: i+1, id: c.id, name: c.name, tag: c.tag, totalPoints: c.totalLp||c.totalPoints||0, weeklyPoints: c.weeklyLp||0, memberCount: c.memberCount })) });
});

export default router;
