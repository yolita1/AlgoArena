import { Router, Request, Response } from 'express';
import db, { DBProblem, DBUser } from '../db/database';
import { requireAdmin } from '../auth/middleware';
import { getRandomProblem as getRandomBuiltin } from '../problems';

const router = Router();

// All routes require admin
router.use(requireAdmin);

// ─── Pending problems ──────────────────────────────────────────────────────────

router.get('/problems/pending', (_req: Request, res: Response): void => {
  const pending: DBProblem[] = db.get('problems').filter({ approved: false }).value();
  res.json({ count: pending.length, problems: pending });
});

// ─── Approve / reject problem ──────────────────────────────────────────────────

router.post('/problems/:id/approve', (req: Request, res: Response): void => {
  const p: DBProblem | undefined = db.get('problems').find({ id: req.params.id }).value();
  if (!p) { res.status(404).json({ error: 'Problem not found' }); return; }

  db.get('problems').find({ id: req.params.id }).assign({ approved: true }).write();
  res.json({ message: 'Problem approved' });
});

router.post('/problems/:id/reject', (req: Request, res: Response): void => {
  const p: DBProblem | undefined = db.get('problems').find({ id: req.params.id }).value();
  if (!p) { res.status(404).json({ error: 'Problem not found' }); return; }

  db.get('problems').remove({ id: req.params.id }).write();
  res.json({ message: 'Problem rejected and deleted' });
});

// ─── Edit problem ──────────────────────────────────────────────────────────────

router.patch('/problems/:id', (req: Request, res: Response): void => {
  const allowed = ['title', 'description', 'inputSpec', 'outputSpec', 'constraints',
                   'exampleInput', 'exampleOutput', 'difficulty', 'category', 'tests', 'botCodes'];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  db.get('problems').find({ id: req.params.id }).assign(updates).write();
  res.json({ message: 'Updated' });
});

// ─── Ban / unban user ──────────────────────────────────────────────────────────

router.post('/users/:id/ban', (req: Request, res: Response): void => {
  const user: DBUser | undefined = db.get('users').find({ id: req.params.id }).value();
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  db.get('users').find({ id: req.params.id }).assign({ banned: true }).write();
  res.json({ message: `User ${user.username} banned` });
});

router.post('/users/:id/unban', (req: Request, res: Response): void => {
  const user: DBUser | undefined = db.get('users').find({ id: req.params.id }).value();
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  db.get('users').find({ id: req.params.id }).assign({ banned: false }).write();
  res.json({ message: `User ${user.username} unbanned` });
});

// ─── Promote to admin ──────────────────────────────────────────────────────────

router.post('/users/:id/promote', (req: Request, res: Response): void => {
  db.get('users').find({ id: req.params.id }).assign({ isAdmin: true }).write();
  res.json({ message: 'Promoted to admin' });
});

// ─── List all users (with search) ─────────────────────────────────────────────

router.get('/users', (req: Request, res: Response): void => {
  const { q } = req.query as Record<string, string>;
  let users: DBUser[] = db.get('users').value();
  if (q) {
    const lq = q.toLowerCase();
    users = users.filter((u) => u.username.toLowerCase().includes(lq) || (u.email || '').includes(lq));
  }
  res.json({
    count: users.length,
    users: users.map((u) => ({
      id: u.id, username: u.username, email: u.email,
      banned: u.banned, isAdmin: u.isAdmin, totalPoints: u.totalLp || 0,
      createdAt: u.createdAt,
    })),
  });
});

// ─── Stats overview ────────────────────────────────────────────────────────────

router.get('/stats', (_req: Request, res: Response): void => {
  const users: DBUser[]     = db.get('users').value();
  const problems: DBProblem[]= db.get('problems').value();

  res.json({
    totalUsers:       users.length,
    activeUsers:      users.filter((u) => !u.banned).length,
    bannedUsers:      users.filter((u) => u.banned).length,
    totalProblems:    problems.length,
    approvedProblems: problems.filter((p) => p.approved).length,
    pendingProblems:  problems.filter((p) => !p.approved).length,
    preBacProblems:   problems.filter((p) => p.approved && p.difficulty === 'pre_bac').length,
    postBacProblems:  problems.filter((p) => p.approved && p.difficulty === 'post_bac').length,
  });
});

// Make first registered user admin if no admin exists
export function ensureDefaultAdmin(): void {
  const adminExists = db.get('users').find({ isAdmin: true }).value();
  if (!adminExists) {
    const first: DBUser | undefined = db.get('users').nth(0).value();
    if (first) {
      db.get('users').find({ id: first.id }).assign({ isAdmin: true }).write();
      console.log(`[admin] Promoted ${first.username} to admin (first user)`);
    }
  }
}

export default router;
