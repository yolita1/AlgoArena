import { runCode, normaliseOutput } from '../runner/Runner';
import { Language, Problem, TestCase, TestResult, RunResultPayload } from '../types';
import { analyseComplexity, ComplexityResult } from './Complexity';

/**
 * Run a player's code against ALL tests.
 * Runs every test even on failure so the player sees the full picture.
 */
export async function judgeSubmission(
  code: string,
  language: Language,
  problem: Problem
): Promise<{ results: TestResult[]; passed: boolean; passedCount: number; totalMs: number; complexity: ComplexityResult }> {
  const results: TestResult[] = [];
  let totalMs = 0;

  for (let i = 0; i < problem.tests.length; i++) {
    const result = await runSingleTest(code, language, problem.tests[i], i);
    results.push(result);
    totalMs += result.time ?? 0;
    // Stop early only on TLE / hard crash to avoid wasting resources
    if (!result.passed && result.error?.includes('Time limit')) break;
  }

  const passed       = results.length === problem.tests.length && results.every(r => r.passed);
  const passedCount  = results.filter(r => r.passed).length;
  const complexity   = analyseComplexity(code, language);
  return { results, passed, passedCount, totalMs, complexity };
}

/**
 * Run only the visible (non-hidden) tests — for the "Run" button.
 * Shows up to 3 visible tests so the player gets useful feedback.
 */
export async function judgeVisible(
  code: string,
  language: Language,
  problem: Problem
): Promise<RunResultPayload> {
  const visibleTests = problem.tests.filter(t => !t.hidden).slice(0, 3);
  const results: TestResult[] = [];
  let totalMs = 0;

  for (let i = 0; i < visibleTests.length; i++) {
    const result = await runSingleTest(code, language, visibleTests[i], i);
    results.push(result);
    totalMs += result.time ?? 0;
  }

  return {
    results,
    totalTests:   visibleTests.length,
    passedTests:  results.filter(r => r.passed).length,
    timeMs:       totalMs,
  };
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function runSingleTest(
  code: string, language: Language, test: TestCase, index: number
): Promise<TestResult> {
  const runResult = await runCode(code, language, test.input);

  if (!runResult.success) {
    return {
      testIndex: index, passed: false,
      expected: test.output, got: '',
      error: runResult.error || runResult.stderr || 'Runtime error',
      time: runResult.timeMs,
    };
  }

  const got      = normaliseOutput(runResult.stdout);
  const expected = normaliseOutput(test.output);
  return { testIndex: index, passed: got === expected, expected, got, time: runResult.timeMs };
}
