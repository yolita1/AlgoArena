import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { getUserById, getUserByUsername, DBFriendship } from '../db/database';
import { requireAuth } from '../auth/middleware';
import { publicUser } from './auth';

const router = Router();
router.use(requireAuth);

// ─── My friends list ───────────────────────────────────────────────────────────

router.get('/', (req: Request, res: Response): void => {
  const uid = req.user!.userId;
  const accepted: DBFriendship[] = db.get('friendships')
    .filter((f: DBFriendship) => f.status === 'accepted' && (f.userId === uid || f.friendId === uid))
    .value();

  const friends = accepted.map((f) => {
    const otherId = f.userId === uid ? f.friendId : f.userId;
    const other = getUserById(otherId);
    return other ? publicUser(other) : null;
  }).filter(Boolean);

  res.json(friends);
});

// ─── Pending requests ──────────────────────────────────────────────────────────

router.get('/requests', (req: Request, res: Response): void => {
  const uid = req.user!.userId;
  const pending: DBFriendship[] = db.get('friendships')
    .filter({ friendId: uid, status: 'pending' })
    .value();

  const requests = pending.map((f) => {
    const sender = getUserById(f.userId);
    return sender ? { requestId: f.id, from: publicUser(sender) } : null;
  }).filter(Boolean);

  res.json(requests);
});

// ─── Send request ──────────────────────────────────────────────────────────────

router.post('/request/:username', (req: Request, res: Response): void => {
  const uid    = req.user!.userId;
  const target = getUserByUsername(req.params.username);

  if (!target) { res.status(404).json({ error: 'User not found' }); return; }
  if (target.id === uid) { res.status(400).json({ error: "Can't add yourself" }); return; }

  // Check existing
  const exists = db.get('friendships').find((f: DBFriendship) =>
    (f.userId === uid && f.friendId === target.id) ||
    (f.userId === target.id && f.friendId === uid)
  ).value();
  if (exists) { res.status(400).json({ error: 'Request already exists or already friends' }); return; }

  const f: DBFriendship = {
    id:        uuidv4(),
    userId:    uid,
    friendId:  target.id,
    status:    'pending',
    createdAt: new Date().toISOString(),
  };

  db.get('friendships').push(f).write();
  res.json({ message: `Friend request sent to ${target.username}` });
});

// ─── Accept request ────────────────────────────────────────────────────────────

router.post('/accept/:requestId', (req: Request, res: Response): void => {
  const uid = req.user!.userId;
  const f: DBFriendship | undefined = db.get('friendships').find({ id: req.params.requestId, friendId: uid, status: 'pending' }).value();
  if (!f) { res.status(404).json({ error: 'Request not found' }); return; }

  db.get('friendships').find({ id: f.id }).assign({ status: 'accepted' }).write();
  res.json({ message: 'Friend request accepted' });
});

// ─── Remove friend ─────────────────────────────────────────────────────────────

router.delete('/:friendId', (req: Request, res: Response): void => {
  const uid = req.user!.userId;
  db.get('friendships').remove((f: DBFriendship) =>
    f.status === 'accepted' &&
    ((f.userId === uid && f.friendId === req.params.friendId) ||
     (f.userId === req.params.friendId && f.friendId === uid))
  ).write();
  res.json({ message: 'Friend removed' });
});

export default router;
