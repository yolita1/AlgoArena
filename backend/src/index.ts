import express    from 'express';
import http        from 'http';
import cors        from 'cors';
import path        from 'path';
import helmet      from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { Server }  from 'socket.io';
import { mkdirSync, existsSync } from 'fs';
import { setupGameHandlers }    from './game/GameManager';
import authRouter       from './routes/auth';
import problemsRouter   from './routes/problems';
import leaderboardRouter from './routes/leaderboard';
import clansRouter      from './routes/clans';
import friendsRouter    from './routes/friends';
import adminRouter      from './routes/admin';
import secureAdminRouter from './routes/secureAdmin';
import reportsRouter      from './routes/reports';
import { ensureDefaultAdmin } from './routes/admin';

const PORT       = process.env.PORT ? +process.env.PORT : 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const IS_PROD    = process.env.NODE_ENV === 'production';

// Ensure directories exist
for (const d of ['temp', 'data', 'uploads'].map((x) => path.resolve(__dirname, '../../', x))) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

ensureDefaultAdmin();

// ─── Express ──────────────────────────────────────────────────────────────────
const app = express();

// ── Security headers (helmet) ──────────────────────────────────────────────
app.use(helmet({
  // Allow Monaco editor to load from CDN
  contentSecurityPolicy: false,
  // Allow iframe embedding for Monaco
  frameguard: false,
}));

// ── CORS ───────────────────────────────────────────────────────────────────
// Production: frontend is served FROM this same server → CORS is irrelevant
// Development: allow localhost:5173 (Vite dev server)
const corsOptions = {
  origin: IS_PROD ? false : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// ── Rate limiters ───────────────────────────────────────────────────────────
// Auth: 10 attempts per 15 min (prevents brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PROD ? 10 : 100,
  message: { error: 'Too many attempts — try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// API general: 200 requests per minute
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: IS_PROD ? 200 : 2000,
  message: { error: 'Rate limit exceeded — slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Code submission: max 20 submits per minute (judge is expensive)
const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: IS_PROD ? 20 : 200,
  message: { error: 'Too many code submissions — wait a bit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '500kb' }));
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

app.get('/health', (_req, res) => res.json({
  status:    'ok',
  env:       IS_PROD ? 'production' : 'development',
  clientUrl: CLIENT_URL,
  port:      PORT,
  timestamp: new Date().toISOString(),
}));
app.use('/api/auth',        authLimiter,   authRouter);
app.use('/api/problems',    submitLimiter, problemsRouter);
app.use('/api/leaderboard', apiLimiter,    leaderboardRouter);
app.use('/api/clans',       apiLimiter,    clansRouter);
app.use('/api/friends',     apiLimiter,    friendsRouter);
app.use('/api/admin',       apiLimiter,    adminRouter);
app.use('/api/secure-admin', apiLimiter,   secureAdminRouter);
app.use('/api/reports',      apiLimiter,    reportsRouter);

// ── Standalone admin panel HTML (protected by secret URL) ────────────────────
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change_me_in_env';

// Serve the admin panel HTML at /admin-panel/:secret
app.get('/admin-panel/:secret', (req, res) => {
  if (req.params.secret !== ADMIN_SECRET) {
    res.status(403).send('<h1>403 Forbidden</h1>');
    return;
  }
  res.sendFile(path.resolve(__dirname, '../src/adminPanel.html'));
});

// Wire the admin panel API to the secure admin router under the secret path
app.use('/admin-panel/:secret', (req, res, next) => {
  if (req.params.secret !== ADMIN_SECRET) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  // Rewrite path so secureAdminRouter handlers receive it
  req.params.secret = ADMIN_SECRET;
  next();
}, secureAdminRouter);

// ── Serve compiled frontend (production only) ──────────────────────────────────
// In production, the backend also serves the React app from frontend/dist/
// This means one single Railway service handles everything — no CORS issues.
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

if (IS_PROD) {
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    // SPA fallback: serve index.html for any non-API route
    app.get('*', (_req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
    console.log('📦  Serving frontend from:', frontendDist);
  } else {
    console.warn('⚠  frontend/dist not found at:', frontendDist);
    app.get('/', (_req, res) => res.send('AlgoArena backend running — frontend dist missing'));
  }
}

// ─── Socket.io ────────────────────────────────────────────────────────────────
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: IS_PROD ? false : '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
  pingTimeout:    60000,
  pingInterval:   25000,
  connectTimeout: 45000,
  allowEIO3:      true,
});

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);
  setupGameHandlers(io, socket);
  socket.on('disconnect', (r) => console.log(`[-] ${socket.id} (${r})`));
});

httpServer.listen(PORT, () => {
  console.log(`\n🚀  AlgoArena  →  http://localhost:${PORT}`);
  if (IS_PROD) console.log(`    Mode: production — frontend served from dist\n`);
  else         console.log(`    Frontend dev  →  http://localhost:5173\n`);
});
