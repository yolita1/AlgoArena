import { exec } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { Language, RunResult } from '../types';

const execAsync = promisify(exec);

const TEMP_DIR   = resolve(__dirname, '../../../temp');
const TIMEOUT_MS = 5000;   // 5 s max per test
const MAX_BUFFER = 131072; // 128 KB max output

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Normalise output for comparison:
 * trim + collapse whitespace per line + trim whole string.
 */
export function normaliseOutput(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim().replace(/\s+/g, ' '))
    .join('\n')
    .trim();
}

/**
 * Execute code against the given stdin input.
 * Input is written to a temp file so multiline and special characters work correctly.
 */
export async function runCode(
  code: string,
  language: Language,
  input: string
): Promise<RunResult> {
  ensureTemp();
  const id    = uuidv4().replace(/-/g, '').slice(0, 14);
  const start = Date.now();

  try {
    switch (language) {
      case 'c':      return await runC(code, input, id, start);
      case 'python': return await runPython(code, input, id, start);
      case 'ocaml':  return await runOCaml(code, input, id, start);
      default:       throw new Error(`Unsupported language: ${language}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { stdout: '', stderr: msg, success: false, exitCode: -1, timeMs: Date.now() - start, error: msg };
  }
}

// ─── C ────────────────────────────────────────────────────────────────────────

async function runC(code: string, input: string, id: string, start: number): Promise<RunResult> {
  const srcPath = join(TEMP_DIR, `${id}.c`);
  const binPath = join(TEMP_DIR, `${id}_bin`);
  const inPath  = join(TEMP_DIR, `${id}.in`);

  try {
    writeFileSync(srcPath, code,  'utf8');
    writeFileSync(inPath,  input, 'utf8');

    // ── Compile ──
    try {
      await execAsync(
        `gcc "${srcPath}" -o "${binPath}" -lm -Wall -Wextra -std=c99`,
        { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER }
      );
    } catch (err: unknown) {
      const e = err as { stderr?: string; message?: string };
      const msg = (e.stderr || e.message || String(err)).trim();
      return {
        stdout: '', stderr: msg, success: false, exitCode: 1,
        timeMs: Date.now() - start,
        error: `Compilation error:\n${msg}`,
      };
    }

    // ── Execute ──
    const { stdout, stderr } = await execAsync(
      `"${binPath}" < "${inPath}"`,
      { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER }
    );
    return { stdout, stderr, success: true, exitCode: 0, timeMs: Date.now() - start };

  } catch (err: unknown) {
    return runtimeError(err, start);
  } finally {
    cleanup(srcPath, binPath, inPath);
  }
}

// ─── Python ───────────────────────────────────────────────────────────────────

async function runPython(code: string, input: string, id: string, start: number): Promise<RunResult> {
  const srcPath = join(TEMP_DIR, `${id}.py`);
  const inPath  = join(TEMP_DIR, `${id}.in`);

  try {
    writeFileSync(srcPath, code,  'utf8');
    writeFileSync(inPath,  input, 'utf8');

    const { stdout, stderr } = await execAsync(
      `python3 "${srcPath}" < "${inPath}"`,
      { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER }
    );
    return { stdout, stderr, success: true, exitCode: 0, timeMs: Date.now() - start };

  } catch (err: unknown) {
    return runtimeError(err, start);
  } finally {
    cleanup(srcPath, inPath);
  }
}

// ─── OCaml ────────────────────────────────────────────────────────────────────

async function runOCaml(code: string, input: string, id: string, start: number): Promise<RunResult> {
  const srcPath = join(TEMP_DIR, `${id}.ml`);
  const inPath  = join(TEMP_DIR, `${id}.in`);
  const binPath = join(TEMP_DIR, `${id}_bin`);

  try {
    writeFileSync(srcPath, code,  'utf8');
    writeFileSync(inPath,  input, 'utf8');

    // Try native compilation (fast); fall back to interpreter (always available)
    let compiled = false;
    for (const compileCmd of [
      `ocamlfind ocamlopt -package str -linkpkg "${srcPath}" -o "${binPath}" 2>/dev/null`,
      `ocamlopt "${srcPath}" -o "${binPath}" 2>/dev/null`,
    ]) {
      try {
        await execAsync(compileCmd, { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER });
        compiled = true;
        break;
      } catch { /* try next */ }
    }

    const runCmd = compiled
      ? `"${binPath}" < "${inPath}"`
      : `ocaml "${srcPath}" < "${inPath}"`;

    const { stdout, stderr } = await execAsync(runCmd, {
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
    });

    if (compiled) cleanup(binPath);
    return { stdout, stderr, success: true, exitCode: 0, timeMs: Date.now() - start };

  } catch (err: unknown) {
    // Distinguish compile errors from runtime errors
    const e = err as { killed?: boolean; stderr?: string; stdout?: string; message?: string; code?: number };
    const stderr = e.stderr || '';
    if (stderr.includes('Error:') || stderr.includes('Unbound') || stderr.includes('syntax error')) {
      return {
        stdout: '', stderr, success: false, exitCode: 1,
        timeMs: Date.now() - start,
        error: `Compilation/type error:\n${stderr.trim()}`,
      };
    }
    return runtimeError(err, start);
  } finally {
    cleanup(srcPath, inPath);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function runtimeError(err: unknown, start: number): RunResult {
  const e = err as { killed?: boolean; stderr?: string; stdout?: string; message?: string; code?: number };
  const tle = e.killed === true;
  const msg = tle
    ? 'Time limit exceeded (5s)'
    : (e.stderr || e.message || String(err)).trim();
  return {
    stdout:  e.stdout ?? '',
    stderr:  msg,
    success: false,
    exitCode: tle ? 124 : (e.code ?? 1),
    timeMs:  Date.now() - start,
    error:   msg,
  };
}

function ensureTemp(): void {
  if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
}

function cleanup(...paths: string[]): void {
  for (const p of paths) {
    try { if (existsSync(p)) unlinkSync(p); } catch { /* ignore */ }
  }
}
