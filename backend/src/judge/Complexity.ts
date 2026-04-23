import { Language } from '../types';

export interface ComplexityResult {
  time:       string;   // e.g. "O(n²)"
  space:      string;   // e.g. "O(n)"
  confidence: 'high' | 'medium' | 'low';
  notes:      string;
}

/**
 * Heuristic complexity analyser.
 * Detects loop nesting, recursion, divide-and-conquer patterns.
 * Not a formal analyser — uses pattern matching for common idioms.
 */
export function analyseComplexity(code: string, _language: Language): ComplexityResult {
  const lines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('#') && !l.startsWith('(*'));

  // Count loop nesting depth
  const maxNesting = getMaxLoopNesting(code);

  // Pattern detection flags
  const hasRecursion   = detectRecursion(code);
  const hasDivConquer  = detectDivideAndConquer(code);
  const hasSort        = detectSort(code);
  const hasHashMap     = detectHashMap(code);
  const hasNestedLoop  = maxNesting >= 2;
  const hasCubeLoop    = maxNesting >= 3;
  const hasBinarySearch= detectBinarySearch(code);
  const hasDP          = detectDP(code);

  let time: string;
  let space: string;
  let confidence: ComplexityResult['confidence'];
  let notes: string;

  // Order matters — most specific first
  if (hasCubeLoop) {
    time = 'O(n³)'; space = 'O(1)'; confidence = 'high';
    notes = 'Triple nested loop detected';
  } else if (hasDivConquer && hasRecursion) {
    time = 'O(n log n)'; space = 'O(log n)'; confidence = 'medium';
    notes = 'Divide-and-conquer recursion pattern';
  } else if (hasSort) {
    time = 'O(n log n)'; space = 'O(n)'; confidence = 'high';
    notes = 'Built-in sort call detected';
  } else if (hasNestedLoop && hasHashMap) {
    time = 'O(n)'; space = 'O(n)'; confidence = 'medium';
    notes = 'Nested loop with hash map — likely O(n)';
  } else if (hasNestedLoop) {
    time = 'O(n²)'; space = 'O(1)'; confidence = 'high';
    notes = 'Double nested loop detected';
  } else if (hasDP) {
    time = 'O(n²)'; space = 'O(n)'; confidence = 'medium';
    notes = 'Dynamic programming pattern (table/memo)';
  } else if (hasBinarySearch || (hasRecursion && hasDivConquer)) {
    time = 'O(log n)'; space = 'O(log n)'; confidence = 'medium';
    notes = 'Binary search / halving pattern';
  } else if (hasHashMap) {
    time = 'O(n)'; space = 'O(n)'; confidence = 'medium';
    notes = 'Single pass with hash map';
  } else if (hasRecursion) {
    time = 'O(2ⁿ)'; space = 'O(n)'; confidence = 'low';
    notes = 'Recursion without memoisation — may be exponential';
  } else if (maxNesting === 1) {
    time = 'O(n)'; space = 'O(1)'; confidence = 'high';
    notes = 'Single loop — linear time';
  } else {
    time = 'O(1)'; space = 'O(1)'; confidence = 'low';
    notes = 'No loops or recursion detected — or trivial solution';
  }

  return { time, space, confidence, notes };
}

// ─── Pattern detectors ────────────────────────────────────────────────────────

function getMaxLoopNesting(code: string): number {
  let depth = 0, max = 0;
  for (const line of code.split('\n')) {
    const t = line.trim();
    // Count loop openers
    const opens = (t.match(/\b(for|while|do)\b/g) || []).length;
    // Count closers (very rough)
    const closes = (t.match(/^}|^\(\*.*\*\)|^done\b|^done$/gm) || []).length;
    depth += opens;
    max = Math.max(max, depth);
    depth = Math.max(0, depth - closes);
  }
  return max;
}

function detectRecursion(code: string): boolean {
  // Find function/let name then look for self-call
  const fnMatch = code.match(/(?:let rec\s+(\w+)|def\s+(\w+)|^(\w+)\s*\()/m);
  if (!fnMatch) return false;
  const name = fnMatch[1] || fnMatch[2] || fnMatch[3];
  if (!name) return false;
  // Count occurrences beyond definition
  const regex = new RegExp(`\\b${name}\\s*\\(`, 'g');
  const matches = code.match(regex);
  return (matches?.length ?? 0) > 1;
}

function detectDivideAndConquer(code: string): boolean {
  return /\b(mid|middle|pivot|half|n\s*\/\s*2|lo\s*\+.*hi|left|right)\b/i.test(code)
      && /\b(lo|hi|low|high|start|end|begin)\b/i.test(code);
}

function detectSort(code: string): boolean {
  return /\b(sort|sorted|qsort|std::sort|Array\.sort|List\.sort)\b/.test(code);
}

function detectHashMap(code: string): boolean {
  return /\b(dict|HashMap|hash_map|set\(|{}\s*$|\[\]|Map\(\)|\bmap\b|unordered_map|hashtbl)\b/i.test(code);
}

function detectBinarySearch(code: string): boolean {
  return /\b(lo|low)\b.*\b(hi|high)\b/i.test(code) && /mid\s*=/.test(code);
}

function detectDP(code: string): boolean {
  return /\b(dp\[|memo\[|cache\[|dp\s*=\s*\[|table\[|f\[i\])\b/i.test(code);
}
