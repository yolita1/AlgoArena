/**
 * SECURE ADMIN API — mounted at /admin-panel/:secret/*
 * The secret is verified by the middleware in index.ts BEFORE reaching here.
 * Routes here use simple paths: /stats, /users, etc.
 */
import { Router, Request, Response } from 'express';
import db, { DBUser, DBProblem, DBReport } from '../db/database';

const router = Router();

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', (_req, res) => {
  const users    = db.get('users').value()    as DBUser[];
  const problems = db.get('problems').value() as DBProblem[];
  const reports  = (db.get('reports').value() ?? []) as DBReport[];

  res.json({
    users: {
      total:   users.length,
      active:  users.filter(u => !u.banned).length,
      banned:  users.filter(u => u.banned).length,
      admins:  users.filter(u => u.isAdmin).length,
    },
    problems: {
      total:    problems.length,
      approved: problems.filter(p => p.approved).length,
      pending:  problems.filter(p => !p.approved).length,
      preBac:   problems.filter(p => p.approved && p.difficulty === 'pre_bac').length,
      postBac:  problems.filter(p => p.approved && p.difficulty === 'post_bac').length,
    },
    reports: {
      total:  reports.length,
      open:   reports.filter(r => !r.resolved).length,
    },
    env:   process.env.NODE_ENV || 'development',
    today: new Date().toISOString(),
  });
});

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', (req, res) => {
  const { q = '', limit = '100' } = req.query as Record<string, string>;
  let users = db.get('users').value() as DBUser[];
  if (q) {
    const lq = q.toLowerCase();
    users = users.filter(u => u.username.toLowerCase().includes(lq) || (u.email || '').includes(lq));
  }
  const limitN = Math.min(200, parseInt(limit));
  res.json({
    total: users.length,
    users: users.slice(0, limitN).map(u => ({
      id: u.id, username: u.username, email: u.email,
      level: u.level, establishment: u.establishment,
      totalLp: u.totalLp || 0, gamesPlayed: u.gamesPlayed || 0, gamesWon: u.gamesWon || 0,
      banned: u.banned, isAdmin: u.isAdmin, streak: u.streak,
      createdAt: u.createdAt,
    })),
  });
});

router.post('/users/:id/ban', (req, res) => {
  const u = db.get('users').find({ id: req.params.id }).value() as DBUser | undefined;
  if (!u) { res.status(404).json({ error: 'User not found' }); return; }
  if (u.isAdmin) { res.status(400).json({ error: 'Cannot ban an admin' }); return; }
  db.get('users').find({ id: req.params.id }).assign({ banned: true }).write();
  res.json({ message: `${u.username} banned` });
});

router.post('/users/:id/unban', (req, res) => {
  const u = db.get('users').find({ id: req.params.id }).value() as DBUser | undefined;
  if (!u) { res.status(404).json({ error: 'Not found' }); return; }
  db.get('users').find({ id: req.params.id }).assign({ banned: false }).write();
  res.json({ message: `${u.username} unbanned` });
});

router.post('/users/:id/promote', (req, res) => {
  db.get('users').find({ id: req.params.id }).assign({ isAdmin: true }).write();
  res.json({ message: 'Promoted to admin' });
});

router.delete('/users/:id', (req, res) => {
  const u = db.get('users').find({ id: req.params.id }).value() as DBUser | undefined;
  if (!u) { res.status(404).json({ error: 'Not found' }); return; }
  if (u.isAdmin) { res.status(400).json({ error: 'Cannot delete an admin' }); return; }
  db.get('users').remove({ id: req.params.id }).write();
  res.json({ message: `${u.username} deleted` });
});

// ── Problems ──────────────────────────────────────────────────────────────────
router.get('/problems/pending', (_req, res) => {
  const pending = db.get('problems').filter({ approved: false }).value() as DBProblem[];
  res.json({ count: pending.length, problems: pending });
});

router.get('/problems', (_req, res) => {
  const probs = db.get('problems').value() as DBProblem[];
  res.json({ count: probs.length, problems: probs });
});

router.post('/problems/:id/approve', (req, res) => {
  const p = db.get('problems').find({ id: req.params.id }).value() as DBProblem | undefined;
  if (!p) { res.status(404).json({ error: 'Not found' }); return; }
  db.get('problems').find({ id: req.params.id }).assign({ approved: true }).write();
  res.json({ message: `"${p.title}" approved` });
});

router.post('/problems/:id/reject', (req, res) => {
  const p = db.get('problems').find({ id: req.params.id }).value() as DBProblem | undefined;
  if (!p) { res.status(404).json({ error: 'Not found' }); return; }
  db.get('problems').remove({ id: req.params.id }).write();
  res.json({ message: `"${p.title}" deleted` });
});

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/reports', (_req, res) => {
  const reports = (db.get('reports').value() ?? []) as DBReport[];
  res.json({ count: reports.length, reports: [...reports].reverse() });
});

router.post('/reports/:id/resolve', (req, res) => {
  const reports = db.get('reports') as any;
  if (!reports.find({ id: req.params.id }).value()) {
    res.status(404).json({ error: 'Not found' }); return;
  }
  reports.find({ id: req.params.id }).assign({ resolved: true }).write();
  res.json({ message: 'Resolved' });
});

export default router;
