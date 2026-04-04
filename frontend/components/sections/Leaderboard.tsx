'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Zap, Target, Crown, Search, Activity, ChevronRight, Plus, RotateCcw, AlertTriangle } from 'lucide-react';

// ─── Design Tokens ───────────────────────────────────────────────────────────
const TOKEN = {
  red:      '#ff1744',
  redDim:   '#d6133a',
  redGlow:  'rgba(255,23,68,0.4)',
  redFaint: 'rgba(255,23,68,0.08)',
  cyan:     '#00e5ff',
  bg:       '#050509',
  bgNav:    'rgba(5,5,9,0.90)',
  card:     'rgba(255,255,255,0.05)',
  border:   'rgba(255,255,255,0.10)',
  muted:    '#6b7280',
  white:    '#ffffff',
} as const;

// ─── Leaderboard Service ─────────────────────────────────────────────────────
const STORAGE_KEY  = 'fraudguard_leaderboard_data';
const MULTIPLIERS: Record<string, number> = { Easy: 1, Medium: 1.5, Hard: 2 };

const getInitialData = () => [
  { id: '1', codename: 'NEO_GHOST',   score: 9850, accuracy: 99.2, difficulty: 'Hard',   timestamp: Date.now() - 100000 },
  { id: '2', codename: 'CYBER_VIGIL', score: 9620, accuracy: 97.8, difficulty: 'Hard',   timestamp: Date.now() - 200000 },
  { id: '3', codename: 'VOID_RUNNER', score: 9400, accuracy: 96.5, difficulty: 'Medium', timestamp: Date.now() - 300000 },
  { id: '4', codename: 'ROOT_SHELL',  score: 9150, accuracy: 94.2, difficulty: 'Hard',   timestamp: Date.now() - 400000 },
];

function storageSave(data: unknown[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* quota / private mode */ }
}

function storageLoad() {
  if (typeof window === 'undefined') return getInitialData();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : getInitialData();
  } catch {
    return getInitialData();
  }
}

function calcScore(correct: number, wrong: number, difficulty: string) {
  const base = correct * 100 + wrong * -50;
  return Math.max(0, Math.floor(base * (MULTIPLIERS[difficulty] ?? 1)));
}

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Difficulty badge styles ──────────────────────────────────────────────────
const DIFFICULTY_STYLES: Record<string, React.CSSProperties> = {
  Hard:   { color: TOKEN.red,  border: `1px solid rgba(255,23,68,0.35)`,  background: 'rgba(255,23,68,0.10)'  },
  Medium: { color: TOKEN.cyan, border: `1px solid rgba(0,229,255,0.35)`,  background: 'rgba(0,229,255,0.10)'  },
  Easy:   { color: '#34d399',  border: `1px solid rgba(52,211,153,0.35)`, background: 'rgba(52,211,153,0.10)' },
};

function getRankStyle(rank: number): React.CSSProperties {
  if (rank === 1) return {
    background: 'linear-gradient(135deg, rgba(234,179,8,0.18) 0%, rgba(234,179,8,0.04) 100%)',
    border:     '1px solid rgba(234,179,8,0.50)',
    boxShadow:  '0 0 30px rgba(234,179,8,0.18)',
    transform:  'scale(1.015)',
    zIndex:     10,
  };
  if (rank === 2) return {
    background: 'linear-gradient(135deg, rgba(148,163,184,0.18) 0%, rgba(148,163,184,0.04) 100%)',
    border:     '1px solid rgba(148,163,184,0.40)',
    boxShadow:  '0 0 20px rgba(148,163,184,0.08)',
  };
  if (rank === 3) return {
    background: 'linear-gradient(135deg, rgba(180,83,9,0.18) 0%, rgba(180,83,9,0.04) 100%)',
    border:     '1px solid rgba(180,83,9,0.40)',
    boxShadow:  '0 0 20px rgba(180,83,9,0.08)',
  };
  return { background: TOKEN.card, border: `1px solid ${TOKEN.border}` };
}

interface Agent {
  id: string;
  codename: string;
  score: number;
  accuracy: number;
  difficulty: string;
  timestamp: number;
  rank?: number;
}

export default function Leaderboard() {
  const [agents,       setAgents]       = useState<Agent[]>([]);
  const [filter,       setFilter]       = useState('All');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [hoveredId,    setHoveredId]    = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [mounted,      setMounted]      = useState(false);

  useEffect(() => {
    setAgents(storageLoad());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && agents.length > 0) storageSave(agents);
  }, [agents, mounted]);

  const addMockScore = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const diffs   = ['Easy', 'Medium', 'Hard'];
      const diff    = diffs[Math.floor(Math.random() * diffs.length)];
      const correct = Math.floor(Math.random() * 10) + 5;
      const wrong   = Math.floor(Math.random() * 3);
      setAgents(prev => [...prev, {
        id:         genId(),
        codename:   `AGENT_${Math.floor(Math.random() * 9000) + 1000}`,
        score:      calcScore(correct, wrong, diff),
        accuracy:   parseFloat(((correct / (correct + wrong)) * 100).toFixed(1)),
        difficulty: diff,
        timestamp:  Date.now(),
      }]);
      setIsSimulating(false);
    }, 800);
  };

  const resetLeaderboard = () => {
    const initial = getInitialData();
    setAgents(initial);
    storageSave(initial);
  };

  const sorted = useMemo(() =>
    agents
      .filter(a => filter === 'All' || a.difficulty === filter)
      .filter(a => a.codename.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.score - a.score)
      .map((a, i) => ({ ...a, rank: i + 1 })),
    [agents, filter, searchQuery]
  );

  if (!mounted) return (
    <div style={{ minHeight: '100vh', background: TOKEN.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Activity size={32} style={{ color: TOKEN.red, animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,700;0,900;1,900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; }
        body { background: ${TOKEN.bg}; font-family: 'Inter', sans-serif; color: #fff; }
        ::selection { background: ${TOKEN.red}; color: #fff; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${TOKEN.bg}; }
        ::-webkit-scrollbar-thumb { background: rgba(255,23,68,0.4); border-radius: 3px; }

        @keyframes scan   { from { top: -2px; } to { top: 100%; } }
        @keyframes pulse  { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes ping   { 75%, 100% { transform: scale(2); opacity: 0; } }
        @keyframes bounce-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .animate-pulse         { animation: pulse 2s ease-in-out infinite; }
        .animate-ping          { animation: ping 1s cubic-bezier(0,0,0.2,1) infinite; }
        .animate-bounce-subtle { animation: bounce-subtle 3s ease-in-out infinite; }
        .animate-spin          { animation: spin 1s linear infinite; }
        .animate-fadeup        { animation: fadeUp 0.5s ease both; }

        .scan-line {
          position: fixed; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,23,68,0.25), transparent);
          animation: scan 12s linear infinite; pointer-events: none; z-index: 50;
        }
        .crt-overlay {
          position: fixed; inset: 0;
          background: linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.18) 50%),
                      linear-gradient(90deg, rgba(255,0,0,0.02), rgba(0,255,0,0.01), rgba(0,0,255,0.02));
          background-size: 100% 2px, 3px 100%;
          pointer-events: none; z-index: 49;
        }
        .bg-glow {
          position: fixed; inset: 0;
          background: radial-gradient(circle at 50% -15%, rgba(255,23,68,0.18) 0%, transparent 55%);
          pointer-events: none;
        }
        .search-input:focus        { border-color: rgba(255,23,68,0.50) !important; background: rgba(255,255,255,0.08) !important; }
        .search-input::placeholder { color: #4b5563; }
        .btn-primary:hover:not(:disabled) { background: ${TOKEN.redDim} !important; }
        .btn-primary:disabled             { opacity: 0.5; cursor: not-allowed; }
        .btn-ghost:hover { color: #fff !important; }
        .btn-white:hover { background: ${TOKEN.red} !important; color: #fff !important; }

        .rank-row {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          cursor: pointer;
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .rank-row:hover { border-color: rgba(255,23,68,0.40) !important; }

        /* Stats grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 40px;
        }
        .stat-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 12px;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        @media (max-width: 700px) {
          .stats-grid { grid-template-columns: 1fr; }
          .filter-bar { flex-direction: column; align-items: stretch !important; }
          .search-wrap { max-width: 100% !important; }
          .user-card-inner { flex-direction: column; }
          .rank-row { padding: 14px 16px; }
          .score-value { font-size: 18px !important; }
        }
      `}</style>

      <div className="bg-glow" />
      <div className="crt-overlay" />
      <div className="scan-line" />

      <div style={{ minHeight: '100vh', background: TOKEN.bg, color: TOKEN.white, fontFamily: "'Inter', sans-serif" }}>

        {/* Navbar */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          height: '64px', borderBottom: `1px solid ${TOKEN.border}`,
          background: TOKEN.bgNav, backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 40px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', background: TOKEN.red,
              borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 15px ${TOKEN.red}`, flexShrink: 0,
            }}>
              <Shield size={18} color="#fff" />
            </div>
            <span style={{ fontSize: '20px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em' }}>
              FRAUD<span style={{ color: TOKEN.red }}>GUARD</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn-primary"
              onClick={addMockScore}
              disabled={isSimulating}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: TOKEN.red, color: TOKEN.white, border: 'none',
                padding: '8px 18px', borderRadius: '6px',
                fontSize: '10px', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.12em',
                cursor: 'pointer', boxShadow: `0 0 15px ${TOKEN.redGlow}`,
                transition: 'background 0.2s, opacity 0.2s',
              }}
            >
              {isSimulating
                ? <Activity size={12} className="animate-spin" />
                : <Plus size={12} />}
              New Simulation
            </button>
            <button
              className="btn-ghost"
              onClick={resetLeaderboard}
              title="Reset Data"
              style={{ background: 'transparent', border: 'none', color: TOKEN.muted, padding: '8px', cursor: 'pointer', transition: 'color 0.2s', display: 'flex' }}
            >
              <RotateCcw size={16} />
            </button>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `1px solid rgba(255,23,68,0.50)`, background: '#1f2937', overflow: 'hidden' }}>
              <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix" alt="avatar" style={{ width: '100%', height: '100%' }} />
            </div>
          </div>
        </nav>

        {/* Main */}
        <main style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '56px 40px' }}>

          {/* Header */}
          <header style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '4px 14px', borderRadius: '999px',
              background: 'rgba(255,23,68,0.10)', border: `1px solid rgba(255,23,68,0.25)`,
              color: TOKEN.red, fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '20px',
            }}>
              <span
                className={isSimulating ? 'animate-ping' : 'animate-pulse'}
                style={{ width: '8px', height: '8px', borderRadius: '50%', background: TOKEN.red, display: 'inline-block' }}
              />
              {isSimulating ? 'Processing Simulation…' : 'System Online — All Nodes Active'}
            </div>
            <h1 style={{
              fontSize: 'clamp(48px, 9vw, 88px)', fontWeight: 900, fontStyle: 'italic',
              textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '14px',
            }}>
              <span style={{ background: 'linear-gradient(to bottom, #fff 30%, #6b7280)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                🏆 LEADER
              </span>
              <span style={{ color: TOKEN.red, textShadow: `0 0 24px ${TOKEN.red}` }}>BOARD</span>
            </h1>
            <p style={{ color: TOKEN.muted, fontSize: '11px', letterSpacing: '0.30em', textTransform: 'uppercase', fontWeight: 500 }}>
              Top Agents Ranked by Fraud Detection Skill
            </p>
          </header>

          {/* Stats row */}
          <div className="stats-grid">
            {[
              { label: 'Total Agents',    value: agents.length,                                       unit: 'active' },
              { label: 'Top Score',       value: agents.length ? Math.max(...agents.map(a => a.score)).toLocaleString() : '—', unit: 'XP' },
              { label: 'Avg Accuracy',    value: agents.length ? (agents.reduce((s, a) => s + a.accuracy, 0) / agents.length).toFixed(1) + '%' : '—', unit: '' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <span style={{ fontSize: '10px', color: TOKEN.muted, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>{s.label}</span>
                <span style={{ fontSize: '28px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em' }}>
                  {s.value} <span style={{ fontSize: '12px', color: TOKEN.muted, fontStyle: 'normal', fontWeight: 500 }}>{s.unit}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Filter bar */}
          <div className="filter-bar" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', background: TOKEN.card, padding: '4px', borderRadius: '8px', border: `1px solid ${TOKEN.border}` }}>
              {['All', 'Easy', 'Medium', 'Hard'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setFilter(lvl)}
                  style={{
                    padding: '8px 22px', borderRadius: '6px', border: 'none',
                    fontSize: '10px', fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.12em',
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: filter === lvl ? TOKEN.red   : 'transparent',
                    color:      filter === lvl ? TOKEN.white : TOKEN.muted,
                    boxShadow:  filter === lvl ? `0 0 15px ${TOKEN.red}` : 'none',
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <div className="search-wrap" style={{ position: 'relative', flexGrow: 1, maxWidth: '340px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: TOKEN.muted, pointerEvents: 'none' }}>
                <Search size={14} />
              </span>
              <input
                className="search-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search agent codename…"
                style={{
                  width: '100%', background: TOKEN.card, border: `1px solid ${TOKEN.border}`,
                  borderRadius: '8px', padding: '10px 16px 10px 40px',
                  fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: TOKEN.white, outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              />
            </div>
          </div>

          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr auto auto',
            padding: '0 24px 10px',
            gap: '20px',
            fontSize: '9px', fontWeight: 700, color: TOKEN.muted,
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            <span>Rank</span>
            <span>Agent</span>
            <span style={{ textAlign: 'right' }}>Accuracy</span>
            <span style={{ textAlign: 'right', minWidth: '100px' }}>Score</span>
          </div>

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sorted.length > 0 ? sorted.map((agent, idx) => (
              <div
                key={agent.id}
                className="rank-row animate-fadeup"
                onMouseEnter={() => setHoveredId(agent.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  ...getRankStyle(agent.rank!),
                  animationDelay: `${idx * 60}ms`,
                  transform: hoveredId === agent.id
                    ? `${agent.rank === 1 ? 'scale(1.015) ' : ''}translateX(6px)`
                    : agent.rank === 1 ? 'scale(1.015)' : 'none',
                }}
              >
                {/* Rank */}
                <div style={{ width: '44px', textAlign: 'center', flexShrink: 0 }}>
                  {agent.rank === 1 ? (
                    <div className="animate-bounce-subtle" style={{ display: 'inline-block' }}>
                      <Crown size={30} style={{ color: '#facc15', filter: 'drop-shadow(0 0 8px rgba(234,179,8,0.8))' }} />
                    </div>
                  ) : agent.rank! <= 3 ? (
                    <div style={{
                      width: '32px', height: '32px', margin: '0 auto', borderRadius: '50%',
                      border: '2px solid currentColor', background: 'rgba(0,0,0,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 900,
                      color: agent.rank === 2 ? '#94a3b8' : '#d97706',
                    }}>
                      {agent.rank}
                    </div>
                  ) : (
                    <span style={{ fontSize: '16px', fontWeight: 900, fontStyle: 'italic', color: TOKEN.muted }}>
                      #{agent.rank}
                    </span>
                  )}
                </div>

                {/* Avatar + info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexGrow: 1, minWidth: 0 }}>
                  <div style={{
                    width: agent.rank! <= 3 ? '48px' : '40px',
                    height: agent.rank! <= 3 ? '48px' : '40px',
                    borderRadius: '8px', background: 'rgba(0,0,0,0.60)',
                    border: `1px solid ${agent.rank! <= 3 ? 'rgba(255,255,255,0.30)' : TOKEN.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, overflow: 'hidden',
                  }}>
                    <img
                      src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${agent.codename}`}
                      alt="avatar"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {agent.codename}
                      </span>
                      {agent.rank === 1 && <Zap size={12} style={{ color: '#fde047', fill: '#fde047', flexShrink: 0 }} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px', flexWrap: 'wrap' }}>
                      <span style={{
                        ...DIFFICULTY_STYLES[agent.difficulty],
                        fontSize: '9px', fontWeight: 700, padding: '2px 8px',
                        borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.08em',
                      }}>
                        {agent.difficulty}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: TOKEN.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        <span style={{ fontSize: '9px', color: TOKEN.muted }}>{new Date(agent.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accuracy */}
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '80px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                    <Target size={12} style={{ color: TOKEN.cyan }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: TOKEN.white }}>{agent.accuracy}%</span>
                  </div>
                  <div style={{ fontSize: '9px', color: TOKEN.muted, fontWeight: 600, letterSpacing: '0.08em', marginTop: '2px', textTransform: 'uppercase' }}>
                    Accuracy
                  </div>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '110px' }}>
                  <div
                    className="score-value"
                    style={{
                      fontSize: '24px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em',
                      color: hoveredId === agent.id ? TOKEN.red : TOKEN.white, transition: 'color 0.2s',
                    }}
                  >
                    {agent.score.toLocaleString()}
                    <span style={{ fontSize: '10px', fontStyle: 'normal', color: TOKEN.muted, marginLeft: '3px' }}>XP</span>
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRight
                  size={18}
                  style={{ color: TOKEN.red, opacity: hoveredId === agent.id ? 1 : 0, transition: 'opacity 0.2s', flexShrink: 0 }}
                />
              </div>
            )) : (
              <div style={{
                padding: '80px 20px', textAlign: 'center',
                border: `1px dashed ${TOKEN.border}`, borderRadius: '16px', background: TOKEN.card,
              }}>
                <AlertTriangle size={44} style={{ color: '#374151', margin: '0 auto 16px', display: 'block' }} />
                <p style={{ color: TOKEN.muted, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', fontSize: '12px' }}>
                  No agents detected matching query
                </p>
                <button
                  onClick={() => { setFilter('All'); setSearchQuery(''); }}
                  style={{ marginTop: '12px', background: 'none', border: 'none', color: TOKEN.red, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', textDecoration: 'underline', cursor: 'pointer', letterSpacing: '0.10em' }}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>

          {/* User card */}
          <div style={{
            marginTop: '48px', padding: '28px 32px', borderRadius: '16px',
            background: 'rgba(255,23,68,0.05)', border: `1px solid rgba(255,23,68,0.20)`,
            backdropFilter: 'blur(16px)', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, rgba(255,23,68,0.5), transparent)` }} />
            <div className="user-card-inner" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '9px', color: TOKEN.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>
                    User Rank
                  </span>
                  <span style={{ fontSize: '40px', fontWeight: 900, fontStyle: 'italic', textShadow: `0 0 12px ${TOKEN.red}` }}>
                    #42
                  </span>
                </div>
                <div style={{ width: '1px', height: '48px', background: TOKEN.border }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      GHOST_USER_7
                    </span>
                    <span className="animate-pulse" style={{ padding: '2px 8px', borderRadius: '4px', background: TOKEN.red, color: '#fff', fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                      Live
                    </span>
                  </div>
                  <p style={{ fontSize: '10px', color: TOKEN.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Current Accuracy: <span style={{ color: TOKEN.white }}>84.2%</span>
                    {' '}— Rank Up in: <span style={{ color: TOKEN.cyan, fontWeight: 700 }}>140 XP</span>
                  </p>
                </div>
              </div>
              <button
                className="btn-white"
                onClick={() => window.location.href = '/scanner'}
                style={{
                  background: TOKEN.white, color: '#000', border: 'none',
                  padding: '14px 40px', borderRadius: '6px', fontWeight: 900,
                  fontSize: '12px', letterSpacing: '0.12em',
                  textTransform: 'uppercase', cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                  boxShadow: '0 0 20px rgba(255,255,255,0.10)',
                }}
              >
                Start New Scan
              </button>
            </div>
          </div>

        </main>
      </div>
    </>
  );
}