import { useState } from 'react';
import { GameMode, LevelFilter, MODE_LABELS, MODE_DESCS } from '../types';
import { useAuth } from '../context/AuthContext';

const MODES: { id: GameMode; pts: number }[] = [
  { id: 'normal',        pts: 100 },
  { id: 'duel_1v1',      pts: 140 },
  { id: 'best_of_5',     pts: 150 },
  { id: 'panic',         pts: 120 },
  { id: 'buggy_code',    pts: 130 },
  { id: 'sudden_death',  pts: 150 },
  { id: 'hyper_rush',    pts: 140 },
  { id: 'battle_royale', pts: 200 },
  { id: 'team_2v2',      pts: 130 },
  { id: 'king_of_hill',  pts: 160 },
  { id: 'optimization',  pts: 160 },
  { id: 'duel_streak',   pts: 150 },
];

type Tab = 'quick' | 'create' | 'join';

interface Props {
  onQuickMatch:  (name: string, mode: GameMode, level: LevelFilter) => void;
  onCreateRoom:  (name: string, mode: GameMode, level: LevelFilter) => void;
  onJoinByCode:  (name: string, code: string) => void;
  onNavigate:    (page: string) => void;
  errorMessage?: string | null;
}

export default function HomeScreen({ onQuickMatch, onCreateRoom, onJoinByCode, onNavigate, errorMessage }: Props) {
  const { user } = useAuth();
  const [tab,   setTab]   = useState<Tab>('quick');
  const [name,  setName]  = useState('');
  const [code,  setCode]  = useState('');
  const [mode,  setMode]  = useState<GameMode>('normal');
  const [level, setLevel] = useState<LevelFilter>('all');

  const displayName = user?.username || name.trim() || 'Anonyme';

  const go = () => {
    if (tab === 'quick')  onQuickMatch(displayName, mode, level);
    if (tab === 'create') onCreateRoom(displayName, mode, level);
    if (tab === 'join')   { const c = code.trim().toUpperCase(); if (c) onJoinByCode(displayName, c); }
  };

  const btnLabel = tab === 'create' ? 'CRÉER LA SALLE' : 'ENTRER DANS L\'ARÈNE';

  return (
    <div className="home-wrap">
      {/* ── Hero ── */}
      <div style={{ textAlign: 'center' }}>
        <div className="hero-title">Arène<span className="hero-accent">duCode</span></div>
      </div>

      {/* ── Enter button ── */}
      <button className="arena-btn" onClick={go}>{btnLabel}</button>

      {/* ── Tab selector ── */}
      <div className="tab-bar" style={{ maxWidth: 520 }}>
        {(['quick','create','join'] as Tab[]).map(tb => (
          <button key={tb} className={`tab-btn ${tab === tb ? 'active' : ''}`} onClick={() => setTab(tb)}>
            {tb === 'quick' ? 'Partie rapide' : tb === 'create' ? 'Créer une salle' : 'Rejoindre par code'}
          </button>
        ))}
      </div>

      {/* ── Form body ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 520, alignItems: 'center' }}>

        {!user && (
          <input
            className="input"
            placeholder="Ton pseudo (optionnel)"
            maxLength={20}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && go()}
            style={{ maxWidth: 320, textAlign: 'center' }}
          />
        )}

        {tab === 'join' && (
          <input
            className="input input-mono"
            placeholder="CODE DE LA SALLE"
            maxLength={8}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && go()}
            style={{ maxWidth: 240, textAlign: 'center', letterSpacing: 5, fontSize: 16 }}
          />
        )}

        {tab !== 'join' && (
          <>
            {/* Level selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', flexShrink: 0 }}>
                Niveau des exercices
              </span>
              <div style={{ display: 'flex', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 3, gap: 2 }}>
                {([
                  { val: 'all',      label: 'Tous' },
                  { val: 'bac_nsi',  label: 'Bac NSI' },
                  { val: 'pre_bac',  label: 'Lycée' },
                  { val: 'post_bac', label: 'Prépa / Sup' },
                ] as { val: LevelFilter; label: string }[]).map(({ val, label }) => (
                  <button
                    key={val}
                    onClick={() => setLevel(val)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, border: 'none',
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      fontFamily: 'var(--font)',
                      background: level === val ? 'var(--bg-4)' : 'transparent',
                      color:      level === val ? 'var(--text)' : 'var(--text-3)',
                      transition: 'all .15s', whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
              gap: 8, width: '100%',
            }}>
              {MODES.map(({ id: m, pts }) => (
                <div
                  key={m}
                  className={`mode-card ${mode === m ? 'selected' : ''}`}
                  onClick={() => setMode(m)}
                  style={{ width: '100%' }}
                >
                  <div className="mode-card-accent" />
                  <div className="mode-card-pts">+{pts} LP</div>
                  <div className="mode-card-name">{MODE_LABELS[m] ?? m}</div>
                  <div className="mode-card-desc">{MODE_DESCS[m] ?? ''}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {errorMessage && (
          <div className="msg-error" style={{ width: '100%' }}>{errorMessage}</div>
        )}
      </div>

      {/* ── Quick links ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {!user && (
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('profile')}>
            Se connecter / S'inscrire
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('library')}>Bibliothèque</button>
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('leaderboard')}>Classement</button>
      </div>

      {/* ── Footer ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 20, flexWrap: 'wrap',
        paddingTop: 8, borderTop: '1px solid var(--border)',
        fontSize: 11, color: 'var(--text-3)',
      }}>
        <a
          href="https://github.com/yolita1"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-2)', textDecoration: 'none', transition: 'color .15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          github.com/yolita1
        </a>
        <span style={{ color: 'var(--border2)' }}>·</span>
        <a
          href="mailto:algo.arena.fr@gmail.com"
          style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-2)', textDecoration: 'none', transition: 'color .15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
        >
          ✉ algo.arena.fr@gmail.com
        </a>
      </div>
    </div>
  );
}
