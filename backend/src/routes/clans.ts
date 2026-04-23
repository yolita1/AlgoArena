import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { getUserById, DBClan, DBUser } from '../db/database';
import { requireAuth } from '../auth/middleware';
import { publicUser } from './auth';

const router = Router();

// ─── List clans ────────────────────────────────────────────────────────────────

router.get('/', (_req: Request, res: Response): void => {
  const clans: DBClan[] = db.get('clans').value();
  res.json(clans.map(clanPublic));
});

// ─── Get clan ──────────────────────────────────────────────────────────────────

router.get('/:id', (req: Request, res: Response): void => {
  const clan: DBClan | undefined = db.get('clans').find({ id: req.params.id }).value();
  if (!clan) { res.status(404).json({ error: 'Clan not found' }); return; }

  const members: DBUser[] = db.get('users').filter({ clanId: clan.id, banned: false }).value();
  res.json({ ...clanPublic(clan), members: members.map(publicUser) });
});

// ─── Create clan ───────────────────────────────────────────────────────────────

router.post('/', requireAuth, (req: Request, res: Response): void => {
  const user = getUserById(req.user!.userId);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (user.clanId) { res.status(400).json({ error: 'Leave your current clan first' }); return; }

  const { name, tag, description } = req.body;
  if (!name || !tag) { res.status(400).json({ error: 'name and tag required' }); return; }

  const cleanTag = String(tag).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  if (cleanTag.length < 2) { res.status(400).json({ error: 'Tag must be 2-5 letters/digits' }); return; }

  // Check tag uniqueness
  const exists = db.get('clans').find({ tag: cleanTag }).value();
  if (exists) { res.status(400).json({ error: 'Clan tag already taken' }); return; }

  const clan: DBClan = { id: uuidv4(), name: String(name).slice(0,40), tag: cleanTag, description: String(description||'').slice(0,200), leaderId: user.id, totalLp: 0, weeklyLp: 0, memberCount: 1, createdAt: new Date().toISOString() };

  db.get('clans').push(clan).write();
  db.get('users').find({ id: user.id }).assign({ clanId: clan.id }).write();

  res.status(201).json(clanPublic(clan));
});

// ─── Join clan ─────────────────────────────────────────────────────────────────

router.post('/:id/join', requireAuth, (req: Request, res: Response): void => {
  const user = getUserById(req.user!.userId);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (user.clanId) { res.status(400).json({ error: 'Leave your current clan first' }); return; }

  const clan: DBClan | undefined = db.get('clans').find({ id: req.params.id }).value();
  if (!clan) { res.status(404).json({ error: 'Clan not found' }); return; }

  db.get('users').find({ id: user.id }).assign({ clanId: clan.id }).write();
  db.get('clans').find({ id: clan.id }).assign({ memberCount: clan.memberCount + 1 }).write();
  res.json({ message: `Joined clan [${clan.tag}] ${clan.name}` });
});

// ─── Leave clan ────────────────────────────────────────────────────────────────

router.post('/leave', requireAuth, (req: Request, res: Response): void => {
  const user = getUserById(req.user!.userId);
  if (!user || !user.clanId) { res.status(400).json({ error: 'Not in a clan' }); return; }

  const clan: DBClan | undefined = db.get('clans').find({ id: user.clanId }).value();
  if (clan) {
    const newCount = Math.max(0, clan.memberCount - 1);
    if (newCount === 0) {
      db.get('clans').remove({ id: clan.id }).write();
    } else {
      // Transfer leadership if needed
      if (clan.leaderId === user.id) {
        const newLeader = db.get('users').find({ clanId: clan.id, banned: false })
          .value() as DBUser | undefined;
        if (newLeader) db.get('clans').find({ id: clan.id }).assign({ leaderId: newLeader.id, memberCount: newCount }).write();
      } else {
        db.get('clans').find({ id: clan.id }).assign({ memberCount: newCount }).write();
      }
    }
  }

  db.get('users').find({ id: user.id }).assign({ clanId: null }).write();
  res.json({ message: 'Left clan' });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clanPublic(c: DBClan) {
  return {
    id:           c.id,
    name:         c.name,
    tag:          c.tag,
    description:  c.description,
    leaderId:     c.leaderId,
    totalLp:      c.totalLp||0,
    weeklyLp:     c.weeklyLp||0,
    memberCount:  c.memberCount,
    createdAt:    c.createdAt,
  };
}

export default router;
