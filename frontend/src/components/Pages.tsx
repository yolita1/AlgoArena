import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Avatar, GradeBadge } from './Avatar';

// Grade road - all divisions in order
const TIER_ROAD = [
  { key:'Bronze III',   icon:'🥉', lp:0    },
  { key:'Bronze II',    icon:'🥉', lp:100  },
  { key:'Bronze I',     icon:'🥉', lp:200  },
  { key:'Silver III',   icon:'🥈', lp:300  },
  { key:'Silver II',    icon:'🥈', lp:400  },
  { key:'Silver I',     icon:'🥈', lp:500  },
  { key:'Gold III',     icon:'🥇', lp:600  },
  { key:'Gold II',      icon:'🥇', lp:700  },
  { key:'Gold I',       icon:'🥇', lp:800  },
  { key:'Platinum III', icon:'💠', lp:900  },
  { key:'Platinum II',  icon:'💠', lp:1000 },
  { key:'Platinum I',   icon:'💠', lp:1100 },
  { key:'Diamond III',  icon:'💎', lp:1200 },
  { key:'Diamond II',   icon:'💎', lp:1300 },
  { key:'Diamond I',    icon:'💎', lp:1400 },
  { key:'Master',       icon:'👑', lp:1500 },
  { key:'Legend',       icon:'⚡', lp:1600 },
];

// ────────────────────────────────────────────────────────────────────────────────
// AUTH MODAL
// ────────────────────────────────────────────────────────────────────────────────
export function AuthModal({ onClose }: { onClose: () => void }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username,      setUsername]      = useState('');
  const [password,      setPassword]      = useState('');
  const [email,         setEmail]         = useState('');
  const [establishment, setEstablishment] = useState('');
  const [level,         setLevel]         = useState('pre_bac');
  const [err,           setErr]           = useState('');
  const [loading,       setLoading]       = useState(false);

  const submit = async () => {
    setErr(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register({ username, password, email, establishment, level });
      }
      onClose();
    } catch (e) { setErr((e as Error).message); }
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:16 }}>
      <div className="card" style={{ width:'100%', maxWidth:380, padding:24, display:'flex', flexDirection:'column', gap:14 }}>
        <div className="tab-bar" style={{ marginBottom:4 }}>
          <button className={`tab-btn ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Se connecter</button>
          <button className={`tab-btn ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>S'inscrire</button>
        </div>

        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="input" placeholder="pseudonyme" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>

        {mode === 'register' && (
          <>
            <div className="form-group">
              <label className="form-label">Email (optional)</label>
              <input className="input" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">School / University</label>
              <input className="input" placeholder="Lycée Thiers, MPSI, Fac…" value={establishment} onChange={e => setEstablishment(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Level</label>
              <select className="select" style={{ width:'100%', padding:'9px 12px' }} value={level} onChange={e => setLevel(e.target.value)}>
                <option value="pre_bac">Lycée (Pré-Bac)</option>
                <option value="post_bac">Prépa / Supérieur</option>
              </select>
            </div>
          </>
        )}

        {err && <div className="msg-error">{err}</div>}
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? '…' : mode === 'login' ? 'Connexion' : 'Create Account'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ alignSelf:'center' }}>Annuler</button>
      </div>
    </div>
  );
}

// ─── Avatar upload widget ─────────────────────────────────────────────────────
function AvatarUpload({ avatar, username, grade, fileRef, onUpload }: {
  avatar: string | null; username: string; grade: any;
  fileRef: React.RefObject<HTMLInputElement>;
  onUpload: (f: File) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ position:'relative', cursor:'pointer', flexShrink:0 }}
      onClick={() => fileRef.current?.click()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Avatar avatar={avatar} username={username} size={80} showRank grade={grade} />
      {/* Hover overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'rgba(0,0,0,.55)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        opacity: hover ? 1 : 0, transition: 'opacity .2s',
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>📷</span>
        <span style={{ fontSize: 9, color: '#fff', marginTop: 3, fontWeight: 600 }}>CHANGE</span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display:'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// PROFILE
// ────────────────────────────────────────────────────────────────────────────────
export function ProfilePage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user, logout, refresh } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [est,      setEst]      = useState(user?.establishment ?? '');
  const [lv,       setLv]       = useState<'pre_bac' | 'post_bac'>(user?.level ?? 'pre_bac');
  const [msg,      setMsg]      = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const totalLp = user?.totalPoints ?? 0;
  const currentTierIdx = Math.min(TIER_ROAD.length - 1, Math.floor(totalLp / 100));
  const lpInTier = totalLp % 100;

  if (!user) {
    return (
      <div className="profile-wrap" style={{ alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', gap:16, alignItems:'center' }}>
          <div style={{ fontSize:48 }}>⚡</div>
          <div style={{ fontFamily:'var(--font-title)', fontSize:22, color:'var(--green)' }}>Not signed in</div>
          <div style={{ color:'var(--text-2)', fontSize:13, maxWidth:300 }}>
            Create an account to track your progress, earn grades, and compete on the leaderboard.
          </div>
          <button className="btn btn-primary" onClick={() => setShowAuth(true)}>Se connecter / S'inscrire</button>
        </div>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </div>
    );
  }

  const save = async () => {
    try {
      await api.updateProfile({ establishment: est, level: lv });
      await refresh();
      setEditing(false);
      setMsg('Enregistré !');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) { setMsg((e as Error).message); }
  };

  const uploadAvatar = async (file: File) => {
    try { await api.uploadAvatar(file); await refresh(); }
    catch (e) { console.error(e); }
  };

  return (
    <div className="profile-wrap">
      {/* Hero card */}
      <div className="profile-hero">
        <AvatarUpload
          avatar={user.avatar}
          username={user.username}
          grade={user.grade}
          fileRef={fileRef}
          onUpload={uploadAvatar}
        />

        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontFamily:'var(--font-title)', fontSize:24, fontWeight:700 }}>{user.username}</span>
            <GradeBadge grade={user.grade} size="md" />
            {user.streak > 1 && <span className="streak-badge">🔥 {user.streak} day streak</span>}
          </div>
          {user.establishment && (
            <div style={{ fontSize:12, color:'var(--text-2)' }}>{user.establishment}</div>
          )}
          <div style={{ fontSize:11, color:'var(--text-3)', display:'flex', alignItems:'center', gap:8 }}>
            <span>Top {user.grade?.topPercent ?? '?'}%</span>
            <span>·</span>
            <span>{(user.level as string) === 'post_bac' ? 'Prépa/Sup' : (user.level as string) === 'bac_nsi' ? 'Bac NSI' : 'Lycée'}</span>
            {user.isAdmin && <span className="tag tag-red" style={{ fontSize:8 }}>ADMIN</span>}
          </div>
        </div>

        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          {!editing && <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>Modifier</button>}
          <button className="btn btn-danger btn-sm" onClick={logout}>Déconnexion</button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="card-surface" style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
          {/* Avatar change in edit mode */}
          <div className="form-group">
            <label className="form-label">Profile Photo</label>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <AvatarUpload avatar={user.avatar} username={user.username} grade={user.grade} fileRef={fileRef} onUpload={uploadAvatar} />
              <span style={{ fontSize:12, color:'var(--text-3)' }}>Click photo to change · max 2 MB</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">School / University</label>
            <input className="input" value={est} onChange={e => setEst(e.target.value)} placeholder="Lycée Thiers, MPSI, Fac…" />
          </div>
          <div className="form-group">
            <label className="form-label">Level</label>
            <select className="select" style={{ width:'100%', padding:'9px 12px' }} value={lv} onChange={e => setLv(e.target.value as 'pre_bac' | 'post_bac')}>
              <option value="pre_bac">Lycée (Pré-Bac)</option>
              <option value="post_bac">Prépa / Supérieur</option>
            </select>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary btn-sm" onClick={save}>Enregistrer</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Annuler</button>
          </div>
          {msg && <div className={msg === 'Enregistré !' ? 'msg-success' : 'msg-error'}>{msg}</div>}
        </div>
      )}

      {/* Grade Road */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:10 }}>
          Grade Progress
        </div>
        <div className="grade-road">
          {TIER_ROAD.map((tier, idx) => {
            const isDone    = idx < currentTierIdx;
            const isCurrent = idx === currentTierIdx;
            const isNext    = idx === currentTierIdx + 1;
            return (
              <div key={tier.key} style={{ display:'contents' }}>
                {idx > 0 && <div className={`grade-road-connector ${isDone ? 'done' : ''}`} />}
                <div className={`grade-road-node ${isDone ? 'done' : isCurrent ? 'current' : isNext ? 'next' : ''}`}>
                  <div className="grade-road-icon">{tier.icon}</div>
                  <div className="grade-road-pip" />
                  <div className="grade-road-label">{tier.key.replace(' ', '')}</div>
                  {isCurrent && (
                    <>
                      <div className="lp-bar-wrap">
                        <div className="lp-bar-fill" style={{ width:`${lpInTier}%` }} />
                      </div>
                      <div className="grade-road-lp">{lpInTier}/100</div>
                    </>
                  )}
                  {isNext && (
                    <div className="grade-road-lp" style={{ color:'var(--text-3)' }}>
                      −{100 - lpInTier} LP
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {[
          { label:'Total LP',   value: user.totalPoints },
          { label:'This Week',  value: user.weeklyPoints },
          { label:'Wins',       value: user.gamesWon },
          { label:'Win Rate',   value: user.gamesPlayed > 0 ? `${Math.round(user.gamesWon / user.gamesPlayed * 100)}%` : '—' },
          { label:'Games',      value: user.gamesPlayed },
          { label:'Streak',     value: `${user.streak} 🔥` },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button className="btn btn-outline btn-sm" onClick={() => onNavigate('leaderboard')}>Leaderboard</button>
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('submit')}>Contribute Problem</button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// PROBLEM LIBRARY
// ────────────────────────────────────────────────────────────────────────────────
export function ProblemLibrary({ onNavigate, onPractice }: { onNavigate: (p: string) => void; onPractice?: (p: any) => void }) {
  const { user } = useAuth();
  const [problems, setProblems] = useState<any[]>([]);
  const [query,    setQuery]    = useState('');
  const [diff,     setDiff]     = useState('');
  const [cat,      setCat]      = useState('');
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (query) params.q = query;
      if (diff)  params.difficulty = diff;
      if (cat)   params.category = cat;
      const res = await api.getProblems(params) as any;
      setProblems(res.problems ?? []);
    } catch { setProblems([]); }
    setLoading(false);
  }, [query, diff, cat]);

  useEffect(() => { load(); }, [load]);

  const CATS = ['math','strings','sorting','search','graphs','dynamic_programming','greedy','geometry','other'];

  return (
    <div className="lib-wrap">
      <div className="lib-inner">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div className="page-title">Library</div>
          {user && (
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('submit')}>
              + Contribute Problem
            </button>
          )}
        </div>

        
        {/* Toolbar */}
        <div className="lib-toolbar">
          <input
            className="input lib-search"
            placeholder="Rechercher un exercice…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="lib-filters">
            <select className="select lib-select" value={diff} onChange={e => setDiff(e.target.value)}>
              <option value="">Tous les niveaux</option>
              <option value="bac_nsi">Bac NSI</option>
              <option value="pre_bac">Lycée</option>
              <option value="post_bac">Prépa / Sup</option>
            </select>
            <select className="select lib-select" value={cat} onChange={e => setCat(e.target.value)}>
              <option value="">All categories</option>
              {CATS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="dots" style={{ padding:20, justifyContent:'center' }}>
            <div className="dot" /><div className="dot" /><div className="dot" />
          </div>
        ) : (
          <div className="prob-list">
            {problems.length === 0 && (
              <div style={{ color:'var(--text-3)', fontSize:13, padding:20, textAlign:'center' }}>Aucun exercice trouvé.</div>
            )}
            {problems.map((p: any) => (
              <div key={p.id} className="prob-card">
                <div style={{ flex:1 }}>
                  <div className="prob-card-title">{p.title}</div>
                  <div className="prob-card-meta">
                    <span className={`tag ${p.difficulty === 'post_bac' ? 'tag-purple' : p.difficulty === 'bac_nsi' ? 'tag-green' : 'tag-amber'}`} style={{ fontSize:9 }}>
                      {p.difficulty === 'post_bac' ? 'Prépa/Sup' : p.difficulty === 'bac_nsi' ? 'Bac NSI' : 'Lycée'}
                    </span>
                    <span className="tag tag-gray" style={{ fontSize:9 }}>{p.category}</span>
                    <span style={{ fontSize:10, color:'var(--text-3)' }}>{p.playCount} fois jouée</span>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ fontSize:11 }} onClick={() => {
                    if (onPractice) { onPractice(p); }
                    else { onNavigate('arena'); }
                  }}>▶ Pratiquer</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// LEADERBOARD
// ────────────────────────────────────────────────────────────────────────────────
type LBTab    = 'players' | 'establishments';
type LBPeriod = 'all' | 'weekly' | 'monthly';

export function LeaderboardPage() {
  const { user } = useAuth();
  const [tab,     setTab]     = useState<LBTab>('players');
  const [period,  setPeriod]  = useState<LBPeriod>('all');
  const [level,   setLevel]   = useState('');
  const [rows,    setRows]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { period };
    if (level && tab === 'players') params.level = level;
    const fetcher = tab === 'players'
      ? api.getPlayerLB(params)
      : tab === 'establishments'
        ? api.getEstablishmentLB(params)
        : api.getClanLB(params);
    fetcher
      .then((r: any) => setRows(r.players ?? r.establishments ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [tab, period, level]);

  const rankClass = (r: number) => r === 1 ? 'gold' : r === 2 ? 'silver' : r === 3 ? 'bronze' : '';

  return (
    <div className="lb-wrap">
      <div className="lb-inner">
        <div className="page-title">Leaderboard</div>

        <div className="lb-tabs">
          <button className={`lb-tab ${tab === 'players' ? 'active' : ''}`} onClick={() => setTab('players')}>Players</button>
          <button className={`lb-tab ${tab === 'establishments' ? 'active' : ''}`} onClick={() => setTab('establishments')}>Schools</button>
        </div>

        <div className="lb-period-btns">
          <button className={`btn btn-sm ${period === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPeriod('all')}>All Time</button>
          <button className={`btn btn-sm ${period === 'weekly' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPeriod('weekly')}>This Week</button>
          <button className={`btn btn-sm ${period === 'monthly' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPeriod('monthly')}>This Month</button>
          {tab === 'players' && (
            <select className="select" value={level} onChange={e => setLevel(e.target.value)} style={{ maxWidth:150 }}>
              <option value="">All levels</option>
              <option value="pre_bac">Pre-Bac</option>
              <option value="post_bac">Post-Bac</option>
            </select>
          )}
        </div>

        {loading ? (
          <div className="dots" style={{ padding:20, justifyContent:'center' }}>
            <div className="dot" /><div className="dot" /><div className="dot" />
          </div>
        ) : (
          <div className="lb-rows">
            {rows.length === 0 && (
              <div style={{ color:'var(--text-3)', fontSize:13, padding:20, textAlign:'center' }}>No data yet.</div>
            )}
            {rows.map((row: any) => {
              const isMe = user?.username === row.username;
              return (
                <div key={row.rank} className={`lb-row ${isMe ? 'me' : ''}`}>
                  <div className={`lb-rank ${rankClass(row.rank)}`}>#{row.rank}</div>
                  {tab === 'players' && (
                    <Avatar avatar={row.avatar ?? null} username={row.username ?? '?'} size={34} />
                  )}
                  <div className="lb-info">
                    <div className="lb-name">
                      {tab === 'players' ? row.username : row.establishment}
                    </div>
                    <div className="lb-sub">
                      {tab === 'players' && row.grade && (
                        <span style={{
                          fontSize:10, fontWeight:700, fontFamily:'var(--font-title)',
                          color: row.grade.color,
                          padding:'1px 6px', borderRadius:3,
                          border:`1px solid ${row.grade.color}44`,
                          background: row.grade.bg ?? (row.grade.color + '12'),
                        }}>
                          {row.grade.icon} {row.grade.name}
                        </span>
                      )}
                      {tab === 'players' && row.establishment && (
                        <span style={{fontSize:10,color:'var(--text-3)'}}>{row.establishment}</span>
                      )}
                    </div>
                  </div>
                  <div className="lb-pts">{row.totalPoints} LP</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// CONTRIBUTE PROBLEM
// ────────────────────────────────────────────────────────────────────────────────
export function SubmitProblemPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title:'', description:'', inputSpec:'', outputSpec:'',
    constraints:'', exampleInput:'', exampleOutput:'',
    difficulty:'pre_bac', category:'math',
    isBuggyCode: false,
  });
  // buggy code: one code per language that has the bug
  const [buggyC,      setBuggyC]      = useState('');
  const [buggyPython, setBuggyPython] = useState('');
  const [buggyOcaml,  setBuggyOcaml]  = useState('');
  const [tests, setTests] = useState([{ input:'', output:'', hidden:false }, { input:'', output:'', hidden:true }]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [buggyTab, setBuggyTab] = useState<'python'|'c'|'ocaml'>('python');

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));
  const setTest = (i: number, k: string, v: string | boolean) => {
    const t = [...tests]; (t[i] as any)[k] = v; setTests(t);
  };

  const submit = async () => {
    setErr(''); setMsg('');
    // Validate buggy code mode
    if (form.isBuggyCode) {
      const hasBuggy = buggyPython.trim() || buggyC.trim() || buggyOcaml.trim();
      if (!hasBuggy) { setErr('Buggy Code mode requires at least one buggy code snippet.'); return; }
    }
    try {
      const payload: any = { ...form, tests };
      if (form.isBuggyCode) {
        payload.buggyCode = { python: buggyPython, c: buggyC, ocaml: buggyOcaml };
      }
      const res = await api.submitProblem(payload) as any;
      setMsg(`Submitted for review! ID: ${res.id}`);
    } catch (e) { setErr((e as Error).message); }
  };

  if (!user) {
    return (
      <div className="submit-wrap" style={{ alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', color:'var(--text-2)' }}>Sign in to contribute problems.</div>
        <button className="btn btn-primary" onClick={() => onNavigate('profile')}>Se connecter</button>
      </div>
    );
  }

  const CATS = ['math','strings','sorting','search','graphs','dynamic_programming','greedy','geometry','other'];
  const BUGGY_PLACEHOLDER: Record<string, string> = {
    python: '# Code with a bug — players must fix it to pass tests\n\ndef solve(n):\n    # BUG: off-by-one error\n    for i in range(n):  # should be range(n+1)\n        pass',
    c: '// Code with a bug\n#include <stdio.h>\nint main() {\n    // BUG here\n    return 0;\n}',
    ocaml: '(* Code with a bug *)\nlet () =\n  (* BUG here *)\n  ()',
  };

  return (
    <div className="submit-wrap">
      <div className="page-title" style={{ textAlign:'center' }}>Contribute a Problem</div>
      <div style={{ fontSize:12, color:'var(--text-2)', textAlign:'center' }}>
        Problems are reviewed by admins before appearing in the library.
      </div>

      {/* Mode toggle: standard vs buggy code */}
      <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
        <button
          className={`btn btn-sm ${!form.isBuggyCode ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => set('isBuggyCode', false)}
        >
          Standard problem
        </button>
        <button
          className={`btn btn-sm ${form.isBuggyCode ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => set('isBuggyCode', true)}
        >
          🐛 Buggy Code mode
        </button>
      </div>

      {form.isBuggyCode && (
        <div style={{ padding:'10px 14px', background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.2)', borderRadius:'var(--r)', fontSize:12, color:'var(--red)', lineHeight:1.6 }}>
          <strong>Buggy Code mode:</strong> provide a correct description and test cases as usual.
          Then supply the buggy code (in at least one language) that players will start from and must fix.
          Players see the broken code in the editor — they must correct the bug to pass all tests.
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Title</label>
        <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder={form.isBuggyCode ? 'e.g. Fix the Binary Search' : 'e.g. Bubble Sort'} />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="textarea" value={form.description} onChange={e => set('description', e.target.value)} style={{ minHeight:90 }} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div className="form-group">
          <label className="form-label">Input spec</label>
          <input className="input" value={form.inputSpec} onChange={e => set('inputSpec', e.target.value)} placeholder="Two integers n and m" />
        </div>
        <div className="form-group">
          <label className="form-label">Output spec</label>
          <input className="input" value={form.outputSpec} onChange={e => set('outputSpec', e.target.value)} placeholder="Space-separated list" />
        </div>
        <div className="form-group">
          <label className="form-label">Constraints</label>
          <input className="input" value={form.constraints} onChange={e => set('constraints', e.target.value)} placeholder="1 ≤ n ≤ 1000" />
        </div>
        <div className="form-group">
          <label className="form-label">Level</label>
          <select className="select" style={{ width:'100%', padding:'9px 12px' }} value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
            <option value="bac_nsi">Bac NSI</option>
            <option value="pre_bac">Lycée</option>
            <option value="post_bac">Prépa / Supérieur</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="select" style={{ width:'100%', padding:'9px 12px' }} value={form.category} onChange={e => set('category', e.target.value)}>
            {CATS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div className="form-group">
          <label className="form-label">Example input</label>
          <textarea className="textarea" style={{ fontFamily:'var(--font-mono)', fontSize:12, minHeight:55 }} value={form.exampleInput} onChange={e => set('exampleInput', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Example output</label>
          <textarea className="textarea" style={{ fontFamily:'var(--font-mono)', fontSize:12, minHeight:55 }} value={form.exampleOutput} onChange={e => set('exampleOutput', e.target.value)} />
        </div>
      </div>

      {/* Buggy code editors */}
      {form.isBuggyCode && (
        <div className="form-group">
          <label className="form-label">Buggy Code Starter (at least one language)</label>
          <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:8 }}>
            Provide the broken code players will start from. Leave empty if you don't want to supply that language.
          </div>

          {/* Language tabs */}
          <div style={{ display:'flex', gap:4, marginBottom:8 }}>
            {(['python','c','ocaml'] as const).map(lang => (
              <button
                key={lang}
                className={`btn btn-sm ${buggyTab === lang ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setBuggyTab(lang)}
              >
                {lang === 'ocaml' ? 'OCaml' : lang.toUpperCase()}
                {(lang === 'python' ? buggyPython : lang === 'c' ? buggyC : buggyOcaml).trim() && (
                  <span style={{ marginLeft:4, color:'var(--amber)' }}>●</span>
                )}
              </button>
            ))}
          </div>

          {/* Code editor per tab */}
          {buggyTab === 'python' && (
            <textarea
              className="textarea"
              style={{ fontFamily:'var(--font-mono)', fontSize:12, minHeight:140, color:'var(--text)' }}
              placeholder={BUGGY_PLACEHOLDER.python}
              value={buggyPython}
              onChange={e => setBuggyPython(e.target.value)}
            />
          )}
          {buggyTab === 'c' && (
            <textarea
              className="textarea"
              style={{ fontFamily:'var(--font-mono)', fontSize:12, minHeight:140, color:'var(--text)' }}
              placeholder={BUGGY_PLACEHOLDER.c}
              value={buggyC}
              onChange={e => setBuggyC(e.target.value)}
            />
          )}
          {buggyTab === 'ocaml' && (
            <textarea
              className="textarea"
              style={{ fontFamily:'var(--font-mono)', fontSize:12, minHeight:140, color:'var(--text)' }}
              placeholder={BUGGY_PLACEHOLDER.ocaml}
              value={buggyOcaml}
              onChange={e => setBuggyOcaml(e.target.value)}
            />
          )}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Test Cases (minimum 2)</label>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {tests.map((test, i) => (
            <div key={i} className="card-surface" style={{ padding:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:12, fontWeight:600, color:'var(--text-2)' }}>Test {i + 1}</span>
                <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-3)', marginLeft:'auto', cursor:'pointer' }}>
                  <input type="checkbox" checked={test.hidden} onChange={e => setTest(i, 'hidden', e.target.checked)} />
                  Hidden
                </label>
                {tests.length > 2 && (
                  <button className="btn btn-danger btn-sm" onClick={() => setTests(tests.filter((_, j) => j !== i))}>✕</button>
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:3 }}>Entrée</div>
                  <textarea className="textarea" style={{ fontFamily:'var(--font-mono)', fontSize:11, minHeight:46 }} value={test.input} onChange={e => setTest(i, 'input', e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:3 }}>Expected Output</div>
                  <textarea className="textarea" style={{ fontFamily:'var(--font-mono)', fontSize:11, minHeight:46 }} value={test.output} onChange={e => setTest(i, 'output', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ alignSelf:'flex-start' }} onClick={() => setTests([...tests, { input:'', output:'', hidden:false }])}>
            + Add Test Case
          </button>
        </div>
      </div>

      {err && <div className="msg-error">{err}</div>}
      {msg && <div className="msg-success">{msg}</div>}
      <button className="btn btn-primary" onClick={submit}>Submit for Review</button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// CLANS
// ────────────────────────────────────────────────────────────────────────────────
export function ClansPage() {
  const { user, refresh } = useAuth();
  const [clans,    setClans]    = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [form,     setForm]     = useState({ name:'', tag:'', description:'' });
  const [msg,      setMsg]      = useState('');

  useEffect(() => {
    api.getClans().then((r: any) => setClans(r)).catch(() => setClans([]));
  }, []);

  const create = async () => {
    try {
      await api.createClan(form);
      await refresh();
      setMsg('Clan created!');
      setCreating(false);
      api.getClans().then((r: any) => setClans(r));
    } catch (e) { setMsg((e as Error).message); }
  };

  const join  = async (id: string) => {
    try { await api.joinClan(id); await refresh(); setMsg('Joined!'); }
    catch (e) { setMsg((e as Error).message); }
  };

  const leave = async () => {
    try { await api.leaveClan(); await refresh(); setMsg('Left clan.'); }
    catch (e) { setMsg((e as Error).message); }
  };

  return (
    <div className="clan-wrap">
      <div className="clan-inner">
        <div className="page-title">Clans</div>
        {msg && <div className="msg-success">{msg}</div>}

        {user?.clanId ? (
          <div className="card" style={{ padding:14, display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ color:'var(--text-2)', fontSize:13 }}>You are in a clan.</span>
            <button className="btn btn-danger btn-sm" onClick={leave}>Leave Clan</button>
          </div>
        ) : user ? (
          <button className="btn btn-primary btn-sm" style={{ alignSelf:'flex-start' }} onClick={() => setCreating(true)}>
            Create Clan
          </button>
        ) : (
          <div className="msg-info">Sign in to join or create a clan.</div>
        )}

        {creating && (
          <div className="card-surface" style={{ padding:16, display:'flex', flexDirection:'column', gap:10, maxWidth:400 }}>
            <input className="input" placeholder="Clan name" value={form.name} onChange={e => setForm({ ...form, name:e.target.value })} />
            <input className="input input-mono" placeholder="TAG" maxLength={5} value={form.tag} onChange={e => setForm({ ...form, tag:e.target.value.toUpperCase() })} style={{ letterSpacing:3, maxWidth:120 }} />
            <textarea className="textarea" placeholder="Description…" value={form.description} onChange={e => setForm({ ...form, description:e.target.value })} style={{ minHeight:60 }} />
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-primary btn-sm" onClick={create}>Create</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>Annuler</button>
            </div>
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {clans.map((c: any) => (
            <div key={c.id} className="card" style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <div className="clan-tag-badge">[{c.tag}]</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600 }}>{c.name}</div>
                <div style={{ fontSize:11, color:'var(--text-3)' }}>
                  {c.memberCount} members · {c.totalLp ?? c.totalPoints ?? 0} LP
                </div>
                {c.description && <div style={{ fontSize:11, color:'var(--text-2)', marginTop:3 }}>{c.description}</div>}
              </div>
              {user && !user.clanId && (
                <button className="btn btn-ghost btn-sm" onClick={() => join(c.id)}>Join</button>
              )}
            </div>
          ))}
          {clans.length === 0 && (
            <div style={{ color:'var(--text-3)', fontSize:13, padding:20, textAlign:'center' }}>
              No clans yet. Be the first!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// ADMIN
// ────────────────────────────────────────────────────────────────────────────────
export function AdminPage({ onNavigate: _ }: { onNavigate: (p: string) => void }) {
  const { user } = useAuth();
  const [pending, setPending] = useState<any[]>([]);
  const [stats,   setStats]   = useState<any>(null);
  const [users,   setUsers]   = useState<any[]>([]);
  const [uq,      setUq]      = useState('');
  const [msg,     setMsg]     = useState('');

  useEffect(() => {
    api.adminStats().then(setStats).catch(() => {});
    api.adminPending().then((r: any) => setPending(r.problems ?? [])).catch(() => setPending([]));
  }, []);

  useEffect(() => {
    api.adminListUsers(uq).then((r: any) => setUsers(r.users ?? [])).catch(() => setUsers([]));
  }, [uq]);

  if (!user?.isAdmin) {
    return (
      <div style={{ padding:40, textAlign:'center', color:'var(--red)' }}>
        <div style={{ fontSize:40 }}>🚫</div>
        <div style={{ fontFamily:'var(--font-title)', fontSize:20, marginTop:12 }}>Admin access required</div>
      </div>
    );
  }

  const approve = async (id: string) => { await api.adminApproveProblem(id); setPending(pending.filter(p => p.id !== id)); setMsg('Approved!'); };
  const reject  = async (id: string) => { await api.adminRejectProblem(id);  setPending(pending.filter(p => p.id !== id)); setMsg('Rejected.'); };

  return (
    <div className="admin-wrap">
      <div className="admin-title">⚠ Admin Panel</div>
      {msg && <div className="msg-success">{msg}</div>}

      {stats && (
        <div className="stat-grid">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="stat-card">
              <div className="stat-label">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
              <div className="stat-value" style={{ fontSize:20 }}>{String(v)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'1px' }}>
          Pending Problems ({pending.length})
        </div>
        {pending.length === 0 && <div style={{ fontSize:12, color:'var(--text-3)' }}>✓ All clear</div>}
        {pending.map((p: any) => (
          <div key={p.id} className="pending-card">
            <div style={{ fontSize:14, fontWeight:600 }}>{p.title}</div>
            <div style={{ fontSize:11, color:'var(--text-3)' }}>{p.difficulty} · {p.createdAt?.split('T')[0]}</div>
            <div style={{ fontSize:12, color:'var(--text-2)', maxHeight:50, overflow:'hidden' }}>{p.description}</div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => approve(p.id)}>Approve</button>
              <button className="btn btn-danger btn-sm" onClick={() => reject(p.id)}>Reject</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'1px' }}>Users</div>
        <input className="input" placeholder="Search users…" value={uq} onChange={e => setUq(e.target.value)} style={{ maxWidth:300 }} />
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          {users.map((u: any) => (
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:'var(--r)' }}>
              <span style={{ flex:1, fontSize:13 }}>{u.username}</span>
              {u.isAdmin && <span className="tag tag-blue" style={{ fontSize:8 }}>admin</span>}
              {u.banned  && <span className="tag tag-red"  style={{ fontSize:8 }}>banned</span>}
              <span style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--font-mono)' }}>{u.totalPoints ?? 0} LP</span>
              {!u.banned && !u.isAdmin && (
                <button className="btn btn-danger btn-sm" onClick={async () => { await api.adminBanUser(u.id); setMsg(`${u.username} banned`); setUq(uq); }}>Ban</button>
              )}
              {u.banned && (
                <button className="btn btn-ghost btn-sm" onClick={async () => { await api.adminUnbanUser(u.id); setMsg(`${u.username} unbanned`); setUq(uq); }}>Unban</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
