import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { resolve, extname } from 'path';
import db, { getUserByUsername, getUserById, DBUser } from '../db/database';
import { signToken, requireAuth } from '../auth/middleware';
import { getPlayerRank } from '../db/grades';

const router = Router();

// ─── Multer for avatar upload ──────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: resolve(__dirname, '../../../uploads'),
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}${extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    if (/image\/(jpeg|png|gif|webp)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

// ─── Register ──────────────────────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, email, password, establishment, level } = req.body;

  if (!username || username.length < 2 || username.length > 20) {
    res.status(400).json({ error: 'Username must be 2-20 characters' });
    return;
  }

  if (getUserByUsername(username)) {
    res.status(400).json({ error: 'Username already taken' });
    return;
  }

  if (!['pre_bac', 'post_bac'].includes(level)) {
    res.status(400).json({ error: 'Invalid level' });
    return;
  }

  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  const user: DBUser = {
    id:            uuidv4(),
    username,
    email:         email || null,
    passwordHash,
    avatar:        null,
    establishment: establishment || 'Inconnu',
    level,
    totalLp:       0,
    weeklyLp:      0,
    monthlyLp:     0,
    gamesPlayed:   0,
    gamesWon:      0,
    streak:        0,
    lastPlayedDate:null,
    clanId:        null,
    banned:        false,
    isAdmin:       false,
    badges:        [],
    pinnedBadges:  [],
    cWins:         0,
    pyWins:        0,
    mlWins:        0,
    lossStreak:    0,
    createdAt:     new Date().toISOString(),
  };

  db.get('users').push(user).write();

  // Re-read from DB — ensureDefaultAdmin may have promoted this user
  const saved = getUserById(user.id)!;
  const token = signToken({ userId: saved.id, username: saved.username, isAdmin: saved.isAdmin });
  res.json({ token, user: publicUser(saved) });
});

// ─── Login ─────────────────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  const user = getUserByUsername(username);

  if (!user) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }
  if (user.banned) {
    res.status(403).json({ error: 'This account has been suspended' });
    return;
  }
  if (!user.passwordHash || !password) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = signToken({ userId: user.id, username: user.username, isAdmin: user.isAdmin });
  res.json({ token, user: publicUser(user) });
});

// ─── My profile ────────────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req: Request, res: Response): void => {
  const user = getUserById(req.user!.userId);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(publicUser(user));
});

// ─── Update profile ────────────────────────────────────────────────────────────

router.patch('/me', requireAuth, (req: Request, res: Response): void => {
  const { establishment, level } = req.body;
  const updates: Partial<DBUser> = {};

  if (establishment) updates.establishment = String(establishment).slice(0, 60);
  if (level && ['pre_bac', 'post_bac'].includes(level)) updates.level = level;

  db.get('users').find({ id: req.user!.userId }).assign(updates).write();
  const user = getUserById(req.user!.userId)!;
  res.json(publicUser(user));
});

// ─── Avatar upload ─────────────────────────────────────────────────────────────

router.post('/me/avatar', requireAuth, upload.single('avatar'), (req: Request, res: Response): void => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  db.get('users').find({ id: req.user!.userId }).assign({ avatar: req.file.filename }).write();
  res.json({ avatar: req.file.filename });
});

// ─── Public user profile ───────────────────────────────────────────────────────

router.get('/user/:id', (req: Request, res: Response): void => {
  const user = getUserById(req.params.id);
  if (!user || user.banned) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(publicUser(user));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function publicUser(u: DBUser) {
  const rankInfo = getPlayerRank(u.totalLp || 0);
  return {
    id:            u.id,
    username:      u.username,
    avatar:        u.avatar,
    establishment: u.establishment,
    level:         u.level,
    totalPoints:   u.totalLp,
    weeklyPoints:  u.weeklyLp,
    monthlyPoints: u.monthlyLp,
    gamesPlayed:   u.gamesPlayed,
    gamesWon:      u.gamesWon,
    streak:        u.streak,
    clanId:        u.clanId,
    isAdmin:       u.isAdmin,
    grade: {
      name:    rankInfo.displayName,
      tier:    rankInfo.tier,
      color:   rankInfo.color,
      glow:    rankInfo.glow,
      rarity:  'common',
      icon:    rankInfo.icon,
      lp:      rankInfo.lp,
      topPercent: rankInfo.topPercent,
    },
  };
}

export default router;
