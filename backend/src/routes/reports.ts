import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { DBReport } from '../db/database';
import { optionalAuth, requireAdmin } from '../auth/middleware';

const router = Router();

// POST /api/reports — submit a report (auth optional)
router.post('/', optionalAuth, (req: Request, res: Response): void => {
  const { type, message, context } = req.body;
  if (!type || !message || !['bug', 'problem'].includes(type)) {
    res.status(400).json({ error: 'type (bug|problem) and message are required' });
    return;
  }
  if (String(message).trim().length < 5) {
    res.status(400).json({ error: 'Message too short (min 5 chars)' });
    return;
  }

  const report: DBReport = {
    id:        uuidv4(),
    type:      type as 'bug' | 'problem',
    message:   String(message).trim().slice(0, 2000),
    context:   context ? String(context).slice(0, 200) : undefined,
    userId:    req.user?.userId ?? null,
    username:  req.user?.username ?? null,
    resolved:  false,
    createdAt: new Date().toISOString(),
  };

  db.get('reports').push(report).write();
  res.status(201).json({ message: 'Report received — thank you!' });
});

// GET /api/reports — admin only
router.get('/', requireAdmin, (_req: Request, res: Response): void => {
  const reports = db.get('reports').orderBy('createdAt', 'desc').value() as DBReport[];
  res.json({ count: reports.length, reports });
});

// PATCH /api/reports/:id/resolve — admin only
router.patch('/:id/resolve', requireAdmin, (req: Request, res: Response): void => {
  const r = db.get('reports').find({ id: req.params.id }).value() as DBReport | undefined;
  if (!r) { res.status(404).json({ error: 'Not found' }); return; }
  db.get('reports').find({ id: req.params.id }).assign({ resolved: true }).write();
  res.json({ message: 'Resolved' });
});

export default router;
