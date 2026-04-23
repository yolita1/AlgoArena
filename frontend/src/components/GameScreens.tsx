import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  Language, PlayerPublic, ProblemPublic, RunResultPayload, SubmitResultPayload,
  ChatMessagePayload, GameMode, GameEndPayload, DEFAULT_TEMPLATES, MODE_LABELS,
} from '../types';
import { Avatar, GradeBadge } from './Avatar';

// language → Monaco grammar
const LM: Record<Language, string> = { c: 'c', python: 'python', ocaml: 'plaintext' };
// language → accent colour
const LC: Record<Language, string> = { c: '#5DCAA5', python: '#3B82F6', ocaml: '#F59E0B' };

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const fmtMs   = (ms: number | null) => ms === null ? 'DNF' : fmtTime(Math.floor(ms / 1000));

// ─── Renders problem text with image support (![alt](url) syntax) ────────────
function ProblemBody({ text }: { text: string }) {
  // Split on image markdown: ![alt](url)
  const parts = text.split(/(!\[[^\]]*\]\([^)]+\))/g);
  return (
    <div className="prob-body">
      {parts.map((part, i) => {
        const m = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (m) {
          return (
            <img
              key={i}
              src={m[2]}
              alt={m[1]}
              style={{
                maxWidth: '100%',
                borderRadius: 'var(--r-sm)',
                margin: '8px 0',
                border: '1px solid var(--border)',
                display: 'block',
              }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          );
        }
        return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
      })}
    </div>
  );
}


// ────────────────────────────────────────────────────────────────────────────────
// LOBBY
// ────────────────────────────────────────────────────────────────────────────────
const LOBBY_TIMEOUT = 30;

interface LobbyProps {
  roomId: string | null; mode: GameMode; players: PlayerPublic[];
  state: string; countdown: number | null; mySocketId: string | null;
  onReady: () => void; onLeave: () => void;
}

export function LobbyScreen({ roomId, mode, players, state, countdown, mySocketId, onReady, onLeave }: LobbyProps) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    // Reset timer whenever we join a new room
    startRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    return () => clearInterval(id);
  }, [roomId]); // re-runs on new room

  const me         = players.find(p => p.id === mySocketId);
  const readyCount = players.filter(p => p.ready).length;
  const pct        = Math.min(100, (elapsed / LOBBY_TIMEOUT) * 100);
  const barClass   = elapsed >= 20 ? 'danger' : elapsed >= 12 ? 'warn' : '';

  return (
    <div className="lobby-wrap">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div className="lobby-code-label">Room Code</div>
          <div className="lobby-code">{roomId ?? '...'}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <span className="tag tag-blue" style={{ display:'inline-block', marginBottom:6 }}>
            {MODE_LABELS[mode] ?? mode}
          </span>
          <div style={{ fontSize:12, color:'var(--text-2)' }}>{readyCount}/{players.length} ready</div>
        </div>
      </div>

      {/* Auto-start bar */}
      {state === 'waiting' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-3)', marginBottom:4 }}>
            <span>Auto-starting in…</span>
            <span style={{ fontFamily:'var(--font-mono)', color: elapsed >= 20 ? 'var(--red)' : elapsed >= 12 ? 'var(--amber)' : 'var(--text-3)' }}>
              {Math.max(0, LOBBY_TIMEOUT - elapsed)}s
            </span>
          </div>
          <div className="lobby-timer-bar">
            <div className={`lobby-timer-fill ${barClass}`} style={{ width:`${pct}%` }} />
          </div>
        </div>
      )}

      {/* Player list */}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {players.length === 0 && (
          <div className="dots" style={{ padding:16 }}>
            <div className="dot" /><div className="dot" /><div className="dot" />
            <span style={{ fontSize:12, color:'var(--text-2)', marginLeft:8 }}>Connecting…</span>
          </div>
        )}
        {players.map(p => {
          const isSelf = p.id === mySocketId;
          return (
            <div key={p.id} className={`prow ${p.ready ? 'ready' : ''}`}>
              <div className="prow-left">
                <div className={`prow-dot ${p.ready ? 'ready' : ''}`} />
                <Avatar avatar={p.avatar} username={p.name} size={30} />
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:13, fontWeight:500 }}>{p.name}</span>
                    {isSelf     && <span className="tag tag-green" style={{ fontSize:8 }}>toi</span>}
                    {p.isBot    && <span className="tag tag-gray"  style={{ fontSize:8 }}>bot</span>}
                    {p.establishment && <span style={{ fontSize:10, color:'var(--text-3)' }}>{p.establishment}</span>}
                  </div>
                  {p.grade && <GradeBadge grade={p.grade} size="sm" />}
                </div>
              </div>
              <div className={`prow-status ${p.ready ? 'ready' : ''}`}>
                {p.ready ? '✓ PRÊT' : 'en attente…'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        {state === 'waiting' && (
          <>
            <button className={`btn ${me?.ready ? 'btn-outline' : 'btn-primary'}`} onClick={onReady}>
              {me?.ready ? 'Annuler' : 'Prêt'}
            </button>
            <button className="btn btn-ghost" onClick={onLeave}>Quitter</button>
          </>
        )}
        {state === 'countdown' && countdown !== null && (
          <div className="lobby-countdown">{countdown}</div>
        )}
      </div>

      <div style={{ fontSize:11, color:'var(--text-3)' }}>
        Share code <span style={{ fontFamily:'var(--font-mono)', color:'var(--text-2)', letterSpacing:2 }}>{roomId}</span> avec tes amis
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// GAME SCREEN
// ────────────────────────────────────────────────────────────────────────────────
interface GameProps {
  mySocketId: string | null; problem: ProblemPublic; players: PlayerPublic[];
  startTime: number; durationSeconds: number; mode: GameMode;
  round: number; totalRounds: number;
  runResults: RunResultPayload | null; submitResult: SubmitResultPayload | null;
  isRunning: boolean; isSubmitting: boolean;
  chat: ChatMessagePayload[];
  onRun: (c: string, l: Language) => void;
  onSubmit: (c: string, l: Language) => void;
  onChat: (text: string) => void;
  onQuit: () => void;
  onReport?: () => void;
}

export function GameScreen(props: GameProps) {
  const {
    mySocketId, problem, players, startTime, durationSeconds, mode,
    round, totalRounds, runResults, submitResult,
    isRunning, isSubmitting, chat, onRun, onSubmit, onChat, onQuit, onReport,
  } = props;

  const [lang,    setLang]    = useState<Language>('python');
  const [code,    setCode]    = useState(DEFAULT_TEMPLATES.python);
  const [sLeft,   setSLeft]   = useState(durationSeconds);
  const [chatMsg, setChatMsg] = useState('');

  // Panel widths (px) — resizable
  const [probW, setProbW] = useState(270);
  const [chatW, setChatW] = useState(200);
  const dragLeft  = useRef(false);
  const dragRight = useRef(false);
  const gameWrap  = useRef<HTMLDivElement>(null);
  const codeRef   = useRef(code);
  const chatEnd   = useRef<HTMLDivElement>(null);
  const submitted = submitResult?.passed === true;

  // Keep code ref current so callbacks don't go stale
  useEffect(() => { codeRef.current = code; }, [code]);

  // Auto-scroll chat
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:'smooth' }); }, [chat]);

  // Countdown timer
  useEffect(() => {
    const id = setInterval(() => {
      setSLeft(Math.max(0, durationSeconds - Math.floor((Date.now() - startTime) / 1000)));
    }, 500);
    return () => clearInterval(id);
  }, [startTime, durationSeconds]);

  // Resize drag handlers
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!gameWrap.current) return;
      const rect = gameWrap.current.getBoundingClientRect();
      if (dragLeft.current) {
        const w = Math.max(180, Math.min(420, e.clientX - rect.left));
        setProbW(w);
      }
      if (dragRight.current) {
        const w = Math.max(150, Math.min(320, rect.right - e.clientX));
        setChatW(w);
      }
    };
    const onUp = () => { dragLeft.current = false; dragRight.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, []);

  const timerClass = sLeft <= 20 ? 'danger' : sLeft <= 60 ? 'warn' : '';
  const modeColor  = mode === 'optimization' ? 'tag-purple' : (mode === 'duel_1v1' || mode === 'duel_streak') ? 'tag-red' : 'tag-gray';

  const handleLang = useCallback((l: Language) => {
    if (submitted) return;
    setLang(l);
    // Buggy Code mode: use the provided buggy starter code if available
    const buggyStarter = mode === 'buggy_code' && problem.buggyCode
      ? (problem.buggyCode as Record<string, string>)[l] ?? DEFAULT_TEMPLATES[l]
      : DEFAULT_TEMPLATES[l];
    setCode(buggyStarter);
    codeRef.current = buggyStarter;
  }, [submitted, mode, problem.buggyCode]);

  const handleRun    = useCallback(() => onRun(codeRef.current, lang),    [lang, onRun]);
  const handleSubmit = useCallback(() => onSubmit(codeRef.current, lang), [lang, onSubmit]);
  const sendChat     = useCallback(() => {
    const t = chatMsg.trim();
    if (!t) return;
    onChat(t);
    setChatMsg('');
  }, [chatMsg, onChat]);

  // Mode-specific banner
  const modeBanner = () => {
    if (mode === 'optimization') return (
      <div style={{ padding:'6px 12px', background:'rgba(168,85,247,.1)', border:'1px solid rgba(168,85,247,.3)', borderRadius:'var(--r-sm)', fontSize:11, color:'var(--purple)', fontWeight:600, flexShrink:0 }}>
        ⚡ Optimization — best complexity wins
      </div>
    );
    if (mode === 'sudden_death') return (
      <div style={{ padding:'6px 12px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:'var(--r-sm)', fontSize:11, color:'var(--red)', fontWeight:600, flexShrink:0 }}>
        💀 One submit only
      </div>
    );
    if (mode === 'duel_streak' || mode === 'best_of_5') return (
      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
        {Array.from({ length: totalRounds }, (_, i) => (
          <div key={i} className={`round-pip ${i < round - 1 ? 'won' : i === round - 1 ? 'cur' : ''}`} />
        ))}
        <span style={{ fontSize:10, color:'var(--text-2)', fontFamily:'var(--font-mono)' }}>
          R{round}/{totalRounds}
        </span>
      </div>
    );
    return null;
  };

  // Results renderer
  const renderResults = () => {
    if (isRunning || isSubmitting) {
      return (
        <div className="dots">
          <div className="dot" /><div className="dot" /><div className="dot" />
          <span style={{ fontSize:11, color:'var(--text-2)', marginLeft:8 }}>
            {isRunning ? 'Exécution des tests…' : 'Jugement de tous les tests…'}
          </span>
        </div>
      );
    }

    const results = submitResult?.results ?? runResults?.results ?? null;

    if (!results) {
      return <span style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)' }}>
        → Run to test · Submit to judge all tests
      </span>;
    }

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:4, width:'100%' }}>
        {results.map(r => (
          <div key={r.testIndex} className={`result-row-v ${r.passed ? 'pass' : 'fail'}`}>
            <span className="result-icon" style={{ color: r.passed ? 'var(--green)' : 'var(--red)' }}>
              {r.passed ? '✓' : '✗'}
            </span>
            <span className="result-label">Test {r.testIndex + 1}</span>
            {!r.passed && (
              <span className="result-detail">
                {r.error
                  ? r.error.split('\n')[0].slice(0, 60)
                  : `got: "${r.got.slice(0, 22)}" ≠ "${r.expected.slice(0, 22)}"`}
              </span>
            )}
            {r.time !== undefined && (
              <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:'var(--font-mono)', marginLeft:'auto', flexShrink:0 }}>
                {r.time}ms
              </span>
            )}
          </div>
        ))}

        {/* Complexity badge — highlighted for optimization mode */}
        {submitResult?.complexity && (
          <div className="cx-badge" style={{
            marginTop: 4,
            ...(mode === 'optimization' ? {
              background: 'rgba(168,85,247,.18)',
              border: '1px solid rgba(168,85,247,.5)',
              boxShadow: '0 0 12px rgba(168,85,247,.15)',
            } : {}),
          }}>
            <span>⏱</span>
            <strong style={{ color: mode === 'optimization' ? 'var(--purple)' : 'inherit' }}>
              {submitResult.complexity.time}
            </strong>
            <span style={{ color:'var(--text-3)' }}> time · {submitResult.complexity.space} space</span>
            <span style={{ color:'var(--text-3)', marginLeft:4, fontSize:10 }}>— {submitResult.complexity.notes}</span>
            {mode === 'optimization' && (
              <span style={{ marginLeft:8, color:'var(--amber)', fontWeight:700, fontSize:11 }}>← best wins!</span>
            )}
          </div>
        )}

        {submitResult?.passed && (
          <div className="msg-success" style={{ marginTop:4 }}>
            ✓ All tests passed — rank #{submitResult.rank}
            {submitResult.pointsEarned !== undefined && (
              <span style={{ marginLeft:8, fontWeight:700 }}>+{submitResult.pointsEarned} LP</span>
            )}
          </div>
        )}
        {submitResult && !submitResult.passed && submitResult.error && (
          <div className="msg-error" style={{ marginTop:4, fontFamily:'var(--font-mono)', fontSize:11 }}>
            {submitResult.error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="game-wrap" ref={gameWrap}>

      {/* ── Problem panel ──────────────────────────────────────── */}
      <div className="prob-panel" style={{ width: probW }}>
        <div className="prob-inner">

          {/* Round indicator for multi-round modes */}
          {totalRounds > 1 && (
            <div className="round-indicator">
              <span>Manche {round} / {totalRounds}</span>
              {Array.from({ length: totalRounds }, (_, i) => (
                <div key={i} className={`round-pip ${i < round - 1 ? 'won' : i === round - 1 ? 'cur' : ''}`} />
              ))}
            </div>
          )}

          <div>
            <div className="section-lbl">Problem</div>
            <div className="prob-title">{problem.title}</div>
            <div style={{ marginTop:6, display:'flex', gap:4, flexWrap:'wrap' }}>
              {problem.difficulty && (
                <span className={`tag ${problem.difficulty === 'post_bac' ? 'tag-purple' : 'tag-amber'}`} style={{ fontSize:9 }}>
                  {problem.difficulty === 'post_bac' ? 'Post-Bac' : 'Pre-Bac'}
                </span>
              )}
              {mode === 'optimization' && (
                <span className="tag tag-purple" style={{ fontSize:9 }}>Best complexity wins</span>
              )}
              {mode === 'buggy_code' && (
                <span className="tag tag-red" style={{ fontSize:9 }}>Fix the bug</span>
              )}
            </div>
          </div>

          <div>
            <ProblemBody text={mode === 'buggy_code'
              ? problem.description.replace(/```[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim()
              : problem.description
            } />
            <div className="prob-spec"><b style={{ color:'var(--text-2)' }}>Input: </b>{problem.inputSpec}</div>
            <div className="prob-spec"><b style={{ color:'var(--text-2)' }}>Output: </b>{problem.outputSpec}</div>
            {problem.constraints && (
              <div className="prob-spec"><b style={{ color:'var(--text-2)' }}>Constraints: </b>{problem.constraints}</div>
            )}
          </div>

          <div>
            <div className="section-lbl">Example</div>
            <div className="ex-box">
              <div className="ex-lbl">in</div>
              <div className="ex-val">{problem.exampleInput}</div>
              <div className="ex-lbl" style={{ marginTop:8 }}>out</div>
              <div className="ex-val out">{problem.exampleOutput}</div>
            </div>
          </div>

          {/* Optimization hint */}
          {mode === 'optimization' && (
            <div style={{ padding:'8px 10px', background:'rgba(168,85,247,.07)', border:'1px solid rgba(168,85,247,.2)', borderRadius:'var(--r-sm)', fontSize:11, color:'var(--purple)', lineHeight:1.5 }}>
              <strong>Mode Optimisation :</strong> tout le monde doit passer les tests, mais c'est la <strong>meilleure complexité temporelle</strong> qui gagne. Vise O(n) ou O(log n) !
            </div>
          )}

          {/* Buggy code hint */}
          {mode === 'buggy_code' && (
            <div style={{ padding:'8px 10px', background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.2)', borderRadius:'var(--r-sm)', fontSize:11, color:'var(--red)', lineHeight:1.5 }}>
              <strong>🐛 Mode Code Bogué</strong> — l'éditeur contient une solution avec un bug.
              Trouve-le et corrige-le pour passer tous les tests !
            </div>
          )}

          <div>
            <div className="section-lbl">Players</div>
            <div className="minimap">
              {players.map(p => (
                <div key={p.id} className="mini-row">
                  <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
                    <div className={`mini-dot ${p.rank !== null ? 'done' : p.eliminated ? 'elim' : ''}`} />
                    <Avatar avatar={p.avatar} username={p.name} size={18} />
                    <span className={`mini-name ${p.id === mySocketId ? 'self' : ''}`}>{p.name}</span>
                  </div>
                  <span className={`mini-status ${p.rank !== null ? 'done' : ''}`}>
                    {p.rank !== null ? `#${p.rank} ${fmtMs(p.finishTime)}` : 'en train de coder…'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Left resize handle ─────────────────────────────────── */}
      <div className="resize-handle" onMouseDown={() => { dragLeft.current = true; }} />

      {/* ── Editor panel ───────────────────────────────────────── */}
      <div className="editor-panel">

        {/* TOP BAR — chess-style timer, mode tag, language selector */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          height: 56,
          minHeight: 56,
          flexShrink: 0,
          background: 'var(--bg-1)',
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Timer — chess.com style, prominent */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 2,
            minWidth: 88,
            textAlign: 'center',
            padding: '4px 14px',
            borderRadius: 'var(--r)',
            border: '2px solid',
            transition: 'all .3s',
            ...(timerClass === 'danger' ? {
              color: 'var(--red)',
              background: 'rgba(239,68,68,.1)',
              borderColor: 'rgba(239,68,68,.5)',
              boxShadow: '0 0 14px rgba(239,68,68,.3)',
              animation: 'timerShake .4s ease-in-out infinite',
            } : timerClass === 'warn' ? {
              color: 'var(--amber)',
              background: 'rgba(245,158,11,.08)',
              borderColor: 'rgba(245,158,11,.35)',
            } : {
              color: 'var(--text)',
              background: 'var(--bg-2)',
              borderColor: 'var(--border)',
            }),
          }}>
            {fmtTime(sLeft)}
          </div>

          {/* Mode badge */}
          <span className={`tag ${modeColor}`} style={{ fontSize:10, flexShrink:0 }}>
            {MODE_LABELS[mode] ?? mode}
          </span>

          {/* Mode-specific banner */}
          {modeBanner()}

          {/* Spacer */}
          <div style={{ flex:1 }} />

          {/* Language buttons */}
          <div style={{ display:'flex', flexDirection:'row', gap:4, alignItems:'center', flexShrink:0 }}>
            {(['c', 'python', 'ocaml'] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => handleLang(l)}
                disabled={submitted}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  cursor: submitted ? 'not-allowed' : 'pointer',
                  transition: 'all .15s',
                  background:     lang === l ? 'var(--bg-3)' : 'transparent',
                  color:          lang === l ? LC[l] : 'var(--text-3)',
                  borderColor:    lang === l ? LC[l] + '66' : 'var(--border)',
                  boxShadow:      lang === l ? `0 0 8px ${LC[l]}33` : 'none',
                  opacity:        submitted ? 0.5 : 1,
                }}
              >
                {l === 'ocaml' ? 'OCaml' : l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Monaco Editor */}
        <div style={{ flex:1, overflow:'hidden', minHeight:0 }}>
          <Editor
            height="100%"
            language={LM[lang]}
            value={code}
            onChange={v => { const val = v ?? ''; setCode(val); codeRef.current = val; }}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              tabSize: 4,
              padding: { top: 12, bottom: 8 },
              automaticLayout: true,
              readOnly: submitted,
              cursorStyle: 'line',
              wordWrap: 'off',
            }}
          />
        </div>

        {/* Action bar + results */}
        <div className="actions-results">
          <div className="action-bar">
            {/* 🚩 Report button — left of Run */}
            {onReport && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={onReport}
                title="Signaler un bug ou un problème"
                style={{ fontSize:11, padding:'4px 10px', borderColor:'rgba(245,158,11,.3)', color:'var(--amber)', flexShrink:0 }}
              >
                🚩 Report
              </button>
            )}

            {/* Run button */}
            <button
              className="btn btn-outline btn-sm"
              onClick={handleRun}
              disabled={isRunning || isSubmitting || submitted}
              style={{ minWidth: 84 }}
            >
              {isRunning ? '⏳ En cours…' : 'Tester'}
            </button>

            {/* Submit button with pulse */}
            <div style={{ position:'relative' }}>
              {!submitted && !isSubmitting && (
                <div style={{
                  position: 'absolute',
                  inset: -3,
                  borderRadius: 'calc(var(--r) + 3px)',
                  animation: 'sPulse 2s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />
              )}
              <button
                className={`btn btn-sm ${submitted ? 'btn-outline' : 'btn-primary'}`}
                onClick={handleSubmit}
                disabled={isRunning || isSubmitting || submitted}
                style={{ minWidth: 110, position:'relative', zIndex:1 }}
              >
                {submitted ? '✓ Soumis !' : isSubmitting ? '⏳ Jugement…' : 'Soumettre'}
              </button>
            </div>

            {/* LP earned */}
            {submitResult?.passed && submitResult.pointsEarned !== undefined && (
              <span style={{ fontSize:12, color:'var(--green)', fontFamily:'var(--font-mono)', fontWeight:700 }}>
                +{submitResult.pointsEarned} LP
              </span>
            )}

            {/* Spacer + Leave button */}
            <div style={{ flex:1 }} />
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { if (window.confirm('Quit the game? This counts as a forfeit.')) onQuit(); }}
              style={{ fontSize:11, padding:'4px 10px', borderColor:'rgba(239,68,68,.25)', color:'rgba(239,68,68,.7)', flexShrink:0 }}
            >
              ✕ Leave
            </button>
          </div>

          {/* Results area */}
          <div className="results-area">{renderResults()}</div>
        </div>
      </div>

      {/* ── Right resize handle ────────────────────────────────── */}
      <div className="resize-handle" onMouseDown={() => { dragRight.current = true; }} />

      {/* ── Chat panel ─────────────────────────────────────────── */}
      <div style={{
        width: chatW,
        minWidth: 150,
        maxWidth: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--border)',
        background: 'var(--bg-1)',
        overflow: 'hidden',
      }}>
        <div style={{ padding:'10px 12px 8px', fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'1px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          💬 Chat
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'8px 12px', display:'flex', flexDirection:'column', gap:6 }}>
          {chat.length === 0 && (
            <div style={{ fontSize:11, color:'var(--text-4)', fontStyle:'italic', textAlign:'center', marginTop:8 }}>
              No messages yet
            </div>
          )}
          {chat.map(m => (
            <div key={m.id} style={{ fontSize:11, lineHeight:1.5, wordBreak:'break-word' }}>
              <span style={{ fontWeight:600, marginRight:4, color: m.socketId === mySocketId ? 'var(--green)' : 'var(--text)' }}>
                {m.name}
              </span>
              <span style={{ color:'var(--text-2)' }}>{m.text}</span>
            </div>
          ))}
          <div ref={chatEnd} />
        </div>

        <div style={{ padding:'8px', borderTop:'1px solid var(--border)', display:'flex', gap:5, flexShrink:0 }}>
          <input
            style={{
              flex: 1,
              background: 'var(--bg-3)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              padding: '5px 8px',
              fontSize: 11,
              fontFamily: 'var(--font)',
              outline: 'none',
            }}
            placeholder="Un message…"
            maxLength={200}
            value={chatMsg}
            onChange={e => setChatMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendChat(); } }}
            onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,.4)')}
            onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
          />
          <button
            onClick={sendChat}
            style={{ padding:'5px 10px', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', background:'transparent', color:'var(--text-2)', cursor:'pointer', fontSize:13, transition:'all .15s' }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = 'var(--green)'; (e.target as HTMLButtonElement).style.borderColor = 'var(--green)'; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = 'var(--text-2)'; (e.target as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
          >↑</button>
        </div>
      </div>

    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// PODIUM — animated, LP delta, revenge
// ────────────────────────────────────────────────────────────────────────────────
interface PodiumProps {
  mySocketId: string | null;
  endData: GameEndPayload;
  pointsEarned: number | null;
  onPlayAgain: () => void;
  onLeave?: () => void;
  onRevenge?: () => void;
  canRevenge?: boolean;
}

const POD_COLORS  = ['#F59E0B', '#94A3B8', '#C4956A'];
const POD_HEIGHTS = [160, 120, 88];
const POD_ORDER   = [1, 0, 2];
const POD_LABELS  = ['1ER', '2ÈME', '3ÈME'];

export function PodiumScreen({ mySocketId, endData, pointsEarned, onPlayAgain, onLeave, onRevenge, canRevenge }: PodiumProps) {
  const [cvOpen,  setCvOpen]  = useState(false);
  const [cvData,  setCvData]  = useState<{ name:string; language:Language; code:string } | null>(null);

  const { players, codes, modeOver } = endData;
  const sorted = [...players].sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    return 0;
  });
  const top3   = sorted.slice(0, 3);
  const me     = sorted.find(p => p.id === mySocketId);
  const myRank = sorted.findIndex(p => p.id === mySocketId) + 1;
  const lpPos  = (pointsEarned ?? 0) > 0;

  return (
    <div className="podium-wrap">
      {/* Next round notice */}
      {!modeOver && (
        <div className="msg-info" style={{ width:'100%', maxWidth:500 }}>
          ⏱ Next round starting in a few seconds…
        </div>
      )}

      {/* LP banner */}
      {modeOver && pointsEarned !== null && (
        <div className={`lp-banner ${lpPos ? 'pos' : 'neg'}`}>
          <span style={{ fontSize:30 }}>{myRank===1?'🏆':myRank===2?'🥈':myRank===3?'🥉':'💀'}</span>
          <div style={{ flex:1 }}>
            <div className={`lp-delta-num ${lpPos ? 'pos' : 'neg'}`}>
              {lpPos ? `+${pointsEarned}` : pointsEarned} LP
            </div>
            <div style={{ fontSize:11, color:'var(--text-2)', marginTop:2 }}>
              Rank #{myRank} · Session: {me?.sessionScore ?? 0} LP
              {me?.grade && (
                <> · <span style={{ color:me.grade.color, fontWeight:700 }}>{me.grade.name}</span></>
              )}
            </div>
          </div>
          {me?.grade && <GradeBadge grade={me.grade} size="md" />}
        </div>
      )}

      <div className="podium-title">{modeOver ? 'RÉSULTATS' : 'FIN DE MANCHE'}</div>

      {/* Podium columns */}
      <div className="podium-display">
        {POD_ORDER.map(idx => {
          const p = top3[idx];
          if (!p) return <div key={idx} style={{ flex:1 }} />;
          const isSelf   = p.id === mySocketId;
          const aniBlock = ['pd2','pd1','pd3'][idx];
          const aniInfo  = ['pi2','pi1','pi3'][idx];
          return (
            <div key={p.id} className="podium-col">
              <div className={`podium-info-above ${aniInfo}`}>
                <Avatar avatar={p.avatar} username={p.name} size={36} />
                <div className="podium-name-text" style={{ color: isSelf ? 'var(--green)' : undefined }}>{p.name}</div>
                {p.grade && <GradeBadge grade={p.grade} size="sm" />}
                {p.language && (
                  <span style={{ fontSize:9, fontFamily:'var(--font-mono)', color:LC[p.language as Language] }}>
                    {p.language}
                  </span>
                )}
                <div className="podium-time-sub">{fmtMs(p.finishTime)}</div>
              </div>
              <div
                className={`podium-block ${aniBlock}`}
                style={{ height:POD_HEIGHTS[idx], background:POD_COLORS[idx], boxShadow:`0 0 24px ${POD_COLORS[idx]}55`, opacity: idx===0?1:.8 }}
              >
                <span className="podium-medal">{POD_LABELS[idx]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full result list */}
      <div className="result-list">
        {sorted.map((p, i) => {
          const isSelf  = p.id === mySocketId;
          const hasCode = p.id !== mySocketId && codes[p.id] != null;
          const rk      = i===0?'rk-gold':i===1?'rk-silver':i===2?'rk-bronze':'';
          return (
            <div key={p.id} className={`result-entry ${isSelf?'me':''}`} style={{ animationDelay:`${i * .07}s` }}>
              <span className={`result-rank-num ${rk}`}>#{i+1}</span>
              <Avatar avatar={p.avatar} username={p.name} size={26} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:13, fontWeight:500 }}>{p.name}</span>
                  {isSelf  && <span className="tag tag-green" style={{ fontSize:8 }}>toi</span>}
                  {p.isBot && <span className="tag tag-gray"  style={{ fontSize:8 }}>bot</span>}
                </div>
                {p.grade && <GradeBadge grade={p.grade} size="sm" showIcon={false} />}
                {p.establishment && <div style={{ fontSize:10, color:'var(--text-3)', marginTop:1 }}>{p.establishment}</div>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                {!p.isBot && (p.sessionScore??0)>0 && (
                  <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--green)', fontWeight:700 }}>
                    +{p.sessionScore}LP
                  </span>
                )}
                <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text-3)' }}>{fmtMs(p.finishTime)}</span>
                {p.language && (
                  <span style={{ fontSize:9, color:LC[p.language as Language]??'var(--text-3)', fontFamily:'var(--font-mono)' }}>
                    {p.language}
                  </span>
                )}
                {hasCode && (
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    const e = codes[p.id];
                    if (e) { setCvData({ name:p.name, language:e.language, code:e.code }); setCvOpen(true); }
                  }}>
                    view code
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      {modeOver && (
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
          <button className="btn btn-primary" onClick={onPlayAgain}>▶ Rejouer</button>
          {canRevenge && onRevenge && (
            <button className="revenge-btn" onClick={onRevenge}>😈 Revanche !</button>
          )}
          {onLeave && (
            <button className="btn btn-ghost" onClick={onLeave}>Quitter</button>
          )}
        </div>
      )}

      {/* Code viewer overlay */}
      {cvData && (
        <div className={`code-viewer ${cvOpen ? 'open' : ''}`} style={{ position:'fixed', inset:0, zIndex:200, background:'var(--bg-1)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            <div>
              <span style={{ fontSize:14, fontWeight:600 }}>{cvData.name}</span>
              <span style={{ fontSize:11, fontFamily:'var(--font-mono)', marginLeft:10, color:LC[cvData.language] }}>
                {cvData.language}
              </span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setCvOpen(false)}>Fermer</button>
          </div>
          <pre className="cv-pre">{cvData.code}</pre>
        </div>
      )}
    </div>
  );
}
