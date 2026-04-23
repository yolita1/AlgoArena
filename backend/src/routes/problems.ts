import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { getApprovedProblems, getProblemById, DBProblem } from '../db/database';
import { requireAuth, optionalAuth } from '../auth/middleware';
import { problems as BUILTIN } from '../problems';

const router = Router();

// ── List problems (public) — built-in + user-contributed ──────────────────────
router.get('/', optionalAuth, (req: Request, res: Response): void => {
  const { difficulty, category, q, page = '1', limit = '50' } = req.query as Record<string, string>;

  const builtinAsDb = BUILTIN as unknown as DBProblem[];
  const dbProblems  = getApprovedProblems();
  const dbIds       = new Set(dbProblems.map(p => p.id));

  let problems: DBProblem[] = [
    ...builtinAsDb.filter(p => !dbIds.has(p.id)),
    ...dbProblems,
  ];

  if (difficulty && ['pre_bac', 'post_bac', 'bac_nsi'].includes(difficulty)) {
    problems = problems.filter(p => (p.difficulty ?? 'pre_bac') === difficulty);
  }
  if (category) problems = problems.filter(p => p.category === category);
  if (q) {
    const lq = q.toLowerCase();
    problems = problems.filter(
      p => p.title.toLowerCase().includes(lq) || p.description.toLowerCase().includes(lq)
    );
  }

  const total  = problems.length;
  const pageN  = Math.max(1, parseInt(page));
  const limitN = Math.min(100, parseInt(limit));
  const slice  = problems.slice((pageN - 1) * limitN, pageN * limitN);

  res.json({ total, page: pageN, problems: slice.map(publicProblem) });
});

// ── Get single problem ────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, (req: Request, res: Response): void => {
  const p = getProblemById(req.params.id);
  if (!p || !p.approved) { res.status(404).json({ error: 'Problem not found' }); return; }
  res.json(publicProblem(p));
});

// ── Submit new problem (auth required) ───────────────────────────────────────
router.post('/', requireAuth, (req: Request, res: Response): void => {
  const { title, description, inputSpec, outputSpec, constraints,
          exampleInput, exampleOutput, difficulty, category, tests } = req.body;

  if (!title || !description || !inputSpec || !outputSpec ||
      !exampleInput || !exampleOutput || !difficulty || !Array.isArray(tests) || tests.length === 0) {
    res.status(400).json({ error: 'Missing required fields' }); return;
  }
  if (!['pre_bac', 'post_bac'].includes(difficulty)) {
    res.status(400).json({ error: 'difficulty must be pre_bac or post_bac' }); return;
  }

  const problem: DBProblem = {
    id:            uuidv4(),
    title:         String(title).slice(0, 80),
    description:   String(description).slice(0, 2000),
    inputSpec:     String(inputSpec).slice(0, 300),
    outputSpec:    String(outputSpec).slice(0, 300),
    constraints:   String(constraints || '').slice(0, 200),
    exampleInput:  String(exampleInput).slice(0, 200),
    exampleOutput: String(exampleOutput).slice(0, 200),
    difficulty:    difficulty as 'pre_bac' | 'post_bac',
    category:      String(category || 'other').slice(0, 30),
    tests:         tests.slice(0, 20).map((t: { input: string; output: string; hidden?: boolean }) => ({
      input:  String(t.input || ''),
      output: String(t.output || ''),
      hidden: Boolean(t.hidden),
    })),
    botCodes:     [],
    isBuggyCode:  !!(req.body.isBuggyCode),
    buggyCode:    req.body.buggyCode ?? null,
    authorId:     req.user!.userId,
    approved:     false,
    playCount:    0,
    createdAt:    new Date().toISOString(),
  };

  db.get('problems').push(problem).write();
  res.status(201).json({ message: 'Problem submitted for review', id: problem.id });
});

// ── Categories ────────────────────────────────────────────────────────────────
router.get('/meta/categories', (_req: Request, res: Response): void => {
  res.json(['math', 'strings', 'sorting', 'search', 'graphs', 'trees',
            'dynamic_programming', 'data_structures', 'stacks', 'greedy', 'other']);
});

// ── Helpers ───────────────────────────────────────────────────────────────────
export function publicProblem(p: DBProblem) {
  return {
    id: p.id, title: p.title, description: p.description,
    inputSpec: p.inputSpec, outputSpec: p.outputSpec,
    constraints: p.constraints, exampleInput: p.exampleInput,
    exampleOutput: p.exampleOutput, difficulty: p.difficulty,
    category: p.category, authorId: p.authorId, playCount: p.playCount,
    approved: p.approved, createdAt: p.createdAt,
    visibleTests: p.tests.filter(t => !t.hidden).slice(0, 3),
    isBuggyCode: (p as any).isBuggyCode ?? false,
    buggyCode:   (p as any).buggyCode ?? null,
  };
}

export default router;
