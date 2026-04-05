'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Zap, Target, Crown, Search, Activity, ChevronRight, Plus, RotateCcw, AlertTriangle, ArrowRight, Play } from 'lucide-react';

// ─── Design Tokens (same as main website globals.css) ─────────────────────
// Uses CSS variables for consistency across the entire app
const TOKEN = {
  red:      'var(--red)',      // #ff1744
  redDim:   '#d6133a',
  redGlow:  'rgba(255,23,68,0.4)',
  redFaint: 'rgba(255,23,68,0.08)',
  cyan:     'var(--cyan)',      // #00e5ff
  bg:       'var(--dark)',      // #050509
  bgNav:    'rgba(5,5,9,0.95)', // Slightly darker than main nav
  card:     'var(--card)',      // #12121f
  border:   'var(--border)',    // rgba(255, 23, 68, 0.25)
  muted:    'var(--muted)',     // #7070a0
  white:    '#ffffff',
} as const;

// ─── Leaderboard Service ─────────────────────────────────────────────────────
const LeaderboardService = {
  STORAGE_KEY: 'fraudguard_leaderboard_data',
  POINTS:      { CORRECT: 100, WRONG: -50 },
  MULTIPLIERS: { Easy: 1, Medium: 1.5, Hard: 2 } as Record<string, number>,

  getInitialData: () => [
    { id: '1', codename: 'NEO_GHOST',   score: 9850, accuracy: 99.2, difficulty: 'Hard',   timestamp: Date.now() - 100000 },
    { id: '2', codename: 'CYBER_VIGIL', score: 9620, accuracy: 97.8, difficulty: 'Hard',   timestamp: Date.now() - 200000 },
    { id: '3', codename: 'VOID_RUNNER', score: 9400, accuracy: 96.5, difficulty: 'Medium', timestamp: Date.now() - 300000 },
    { id: '4', codename: 'ROOT_SHELL',  score: 9150, accuracy: 94.2, difficulty: 'Hard',   timestamp: Date.now() - 400000 },
  ],

  save: (data: unknown[]) => localStorage.setItem(
    LeaderboardService.STORAGE_KEY, JSON.stringify(data)
  ),

  load: () => {
    const saved = localStorage.getItem(LeaderboardService.STORAGE_KEY);
    return saved ? JSON.parse(saved) : LeaderboardService.getInitialData();
  },

  calculateScore: (correct: number, wrong: number, difficulty: string) => {
    const base = correct * 100 + wrong * -50;
    return Math.max(0, Math.floor(base * (LeaderboardService.MULTIPLIERS[difficulty] ?? 1)));
  },
};

// ─── Difficulty badge styles ─────────────────────────────────────────────────
const DIFFICULTY_STYLES: Record<string, React.CSSProperties> = {
  Hard:   { color: TOKEN.red,  border: `1px solid rgba(255,23,68,0.35)`,  background: 'rgba(255,23,68,0.10)'  },
  Medium: { color: TOKEN.cyan, border: `1px solid rgba(0,229,255,0.35)`,  background: 'rgba(0,229,255,0.10)'  },
  Easy:   { color: '#34d399',  border: `1px solid rgba(52,211,153,0.35)`, background: 'rgba(52,211,153,0.10)' },
};

// ─── Rank row base styles ─────────────────────────────────────────────────────
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
  return {
    background: TOKEN.card,
    border:     `1px solid ${TOKEN.border}`,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Agent {
  id: string;
  codename: string;
  score: number;
  round1_score?: number;
  round2_score?: number;
  accuracy: number;
  difficulty: string;
  timestamp: number;
  rank?: number;
}

interface LeaderboardProps {
  roomCode?: string | null;
  playerId?: string | null;
  isRound2Game?: boolean;
}

export default function Leaderboard({ roomCode, playerId, isRound2Game = false }: LeaderboardProps) {
  const router = useRouter();
  const [agents,       setAgents]       = useState<Agent[]>([]);
  const [filter,       setFilter]       = useState('All');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [hoveredId,    setHoveredId]    = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showResults, setShowResults]   = useState(isRound2Game);
  const [currentPlayerResult, setCurrentPlayerResult] = useState<any>(null);

  useEffect(() => { setAgents(LeaderboardService.load()); }, []);
  useEffect(() => { if (agents.length > 0) LeaderboardService.save(agents); }, [agents]);

  // 🔥 Load REAL leaderboard from backend when game is finished
  useEffect(() => {
    if (roomCode && isRound2Game) {
      const fetchLeaderboard = async () => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
          const response = await fetch(`${baseUrl}/rooms/${roomCode}/leaderboard`)
          
          if (response.ok) {
            const data = await response.json()
            console.log('✅ Real leaderboard loaded:', data)
            
            // Convert backend leaderboard to Agent format
            const realLeaderboard: Agent[] = data.leaderboard.map((entry: any) => ({
              id: entry.player_id,
              codename: entry.nickname,
              score: entry.score,
              accuracy: 85,
              difficulty: 'Medium',
              timestamp: Date.now(),
            }))
            
            setAgents(realLeaderboard)
            
            // Find current player in the leaderboard
            const currentPlayer = realLeaderboard.find(a => a.id === playerId)
            if (currentPlayer) {
              setCurrentPlayerResult(currentPlayer)
            }
          } else {
            console.error('Failed to fetch leaderboard:', response.status)
            // Fallback to localStorage
            const leaderboardData = localStorage.getItem('leaderboard_scores')
            if (leaderboardData) {
              const gameResults = JSON.parse(leaderboardData)
              const agents: Agent[] = gameResults.map((r: any) => ({
                id: r.playerId,
                codename: r.codename || `PLAYER_${r.playerId.substring(0, 8).toUpperCase()}`,
                score: r.total_score,
                accuracy: r.round2_score > 0 ? 95 : 0,
                difficulty: 'Medium',
                timestamp: new Date(r.timestamp).getTime(),
              }))
              setAgents(agents)
              const current = agents.find(a => a.id === playerId)
              if (current) setCurrentPlayerResult(current)
            }
          }
        } catch (error) {
          console.error('Error fetching leaderboard:', error)
          // Fallback to localStorage
          const leaderboardData = localStorage.getItem('leaderboard_scores')
          if (leaderboardData) {
            const gameResults = JSON.parse(leaderboardData)
            const agents: Agent[] = gameResults.map((r: any) => ({
              id: r.playerId,
              codename: r.codename || `PLAYER_${r.playerId.substring(0, 8).toUpperCase()}`,
              score: r.total_score,
              accuracy: r.round2_score > 0 ? 95 : 0,
              difficulty: 'Medium',
              timestamp: new Date(r.timestamp).getTime(),
            }))
            setAgents(agents)
            const current = agents.find(a => a.id === playerId)
            if (current) setCurrentPlayerResult(current)
          }
        }
      }
      
      fetchLeaderboard()
    }
  }, [roomCode, playerId, isRound2Game])

  const addMockScore = () => {
    // Navigate to play page to join game
    router.push('/play');
  };

  const startNewGame = () => {
    // Navigate to play page to join game
    router.push('/play');
  };

  const resetLeaderboard = () => {
    const initial = LeaderboardService.getInitialData();
    setAgents(initial);
    LeaderboardService.save(initial);
  };

  const sorted = useMemo(() =>
    agents
      .filter(a => filter === 'All' || a.difficulty === filter)
      .filter(a => a.codename.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.score - a.score)
      .map((a, i) => ({ ...a, rank: i + 1 })),
    [agents, filter, searchQuery]
  );

  // ─── Styles (all co-located, no scattered inline/Tailwind mix) ──────────
  const S = {
    // Layout
    page: {
      minHeight:  '100vh',
      background: TOKEN.bg,
      color:      TOKEN.white,
      fontFamily: 'var(--font-body)',
      overflowX:  'hidden',
      paddingTop: 0,
    } as React.CSSProperties,

    // Main content (adjusted - no built-in nav)
    main: {
      maxWidth: '1200px',
      margin:   '0 auto',
      padding:  '48px 24px 96px 24px',
      position: 'relative' as const,
    } as React.CSSProperties,

    // Header
    header: {
      textAlign:    'center' as const,
      marginBottom: '64px',
    } as React.CSSProperties,

    statusBadge: {
      display:        'inline-flex',
      alignItems:     'center',
      gap:            '8px',
      padding:        '4px 12px',
      borderRadius:   '999px',
      background:     'rgba(255,23,68,0.10)',
      border:         `1px solid rgba(255,23,68,0.25)`,
      color:          TOKEN.red,
      fontSize:       '10px',
      fontWeight:     700,
      letterSpacing:  '0.15em',
      textTransform:  'uppercase' as const,
      marginBottom:   '16px',
    } as React.CSSProperties,

    statusDot: (pulse: boolean): React.CSSProperties => ({
      width:        '8px',
      height:       '8px',
      borderRadius: '50%',
      background:   TOKEN.red,
      animation:    pulse ? 'ping 1s cubic-bezier(0,0,0.2,1) infinite' : 'pulse 2s infinite',
    }),

    h1: {
      fontFamily:    'var(--font-head)',
      fontSize:      'clamp(40px, 8vw, 72px)',
      fontWeight:    900,
      fontStyle:     'italic',
      textTransform: 'uppercase' as const,
      letterSpacing: '-0.04em',
      lineHeight:    1,
      marginBottom:  '12px',
    } as React.CSSProperties,

    h1Accent: {
      color:      TOKEN.red,
      textShadow: `0 0 20px ${TOKEN.red}`,
    } as React.CSSProperties,

    subtitle: {
      color:         TOKEN.muted,
      fontSize:      '11px',
      letterSpacing: '0.30em',
      textTransform: 'uppercase' as const,
      fontWeight:    500,
    } as React.CSSProperties,

    // Filter bar
    filterBar: {
      display:        'flex',
      flexWrap:       'wrap' as const,
      alignItems:     'center',
      justifyContent: 'space-between',
      gap:            '12px',
      marginBottom:   '24px',
    } as React.CSSProperties,

    filterGroup: {
      display:      'flex',
      background:   TOKEN.card,
      padding:      '4px',
      borderRadius: '8px',
      border:       `1px solid ${TOKEN.border}`,
    } as React.CSSProperties,

    filterBtn: (active: boolean): React.CSSProperties => ({
      padding:       '8px 20px',
      borderRadius:  '6px',
      border:        'none',
      fontSize:      '10px',
      fontWeight:    800,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      cursor:        'pointer',
      transition:    'all 0.2s',
      background:    active ? TOKEN.red   : 'transparent',
      color:         active ? TOKEN.white : TOKEN.muted,
      boxShadow:     active ? `0 0 15px ${TOKEN.red}` : 'none',
    }),

    searchWrap: {
      position: 'relative' as const,
      flexGrow: 1,
      maxWidth: '300px',
    } as React.CSSProperties,

    searchIcon: {
      position:  'absolute' as const,
      left:      '12px',
      top:       '50%',
      transform: 'translateY(-50%)',
      color:     TOKEN.muted,
      pointerEvents: 'none' as const,
    } as React.CSSProperties,

    searchInput: {
      width:         '100%',
      background:    TOKEN.card,
      border:        `1px solid ${TOKEN.border}`,
      borderRadius:  '8px',
      padding:       '10px 16px 10px 40px',
      fontSize:      '10px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      color:         TOKEN.white,
      outline:       'none',
      boxSizing:     'border-box' as const,
      transition:    'border-color 0.2s, background 0.2s',
    } as React.CSSProperties,

    // Row
    row: (rank: number, hovered: boolean): React.CSSProperties => ({
      ...getRankStyle(rank),
      position:    'relative',
      overflow:    'hidden',
      borderRadius: '12px',
      padding:     '16px',
      display:     'flex',
      alignItems:  'center',
      gap:         '20px',
      cursor:      'pointer',
      transition:  'all 0.3s ease',
      transform:   hovered
        ? `${rank === 1 ? 'scale(1.015) ' : ''}translateX(6px)`
        : rank === 1 ? 'scale(1.015)' : 'none',
      borderColor: hovered && rank > 3
        ? `rgba(255,23,68,0.40)` : undefined,
    }),

    rankCol: {
      width:      '44px',
      textAlign:  'center' as const,
      flexShrink: 0,
    } as React.CSSProperties,

    rankNumber: (rank: number): React.CSSProperties => ({
      fontSize:   rank <= 3 ? '13px' : '18px',
      fontWeight: 900,
      fontStyle:  'italic',
      color:      rank <= 3 ? TOKEN.white : TOKEN.muted,
    }),

    agentAvatar: (top3: boolean): React.CSSProperties => ({
      width:          top3 ? '48px' : '40px',
      height:         top3 ? '48px' : '40px',
      borderRadius:   '8px',
      background:     'rgba(0,0,0,0.60)',
      border:         `1px solid ${top3 ? 'rgba(255,255,255,0.30)' : TOKEN.border}`,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexShrink:     0,
      overflow:       'hidden',
    }),

    codename: {
      fontSize:      '14px',
      fontWeight:    900,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      display:       'flex',
      alignItems:    'center',
      gap:           '8px',
    } as React.CSSProperties,

    badge: (difficulty: string): React.CSSProperties => ({
      ...DIFFICULTY_STYLES[difficulty],
      fontSize:      '9px',
      fontWeight:    700,
      padding:       '2px 8px',
      borderRadius:  '4px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
    }),

    accLabel: {
      display:       'flex',
      alignItems:    'center',
      gap:           '4px',
      fontSize:      '9px',
      color:         TOKEN.muted,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.12em',
    } as React.CSSProperties,

    scoreCol: {
      display:     'flex' as const,
      flexDirection: 'column' as const,
      alignItems:  'flex-end',
      textAlign:   'right' as const,
      flexShrink:  0,
      justifyContent: 'center',
    } as React.CSSProperties,

    scoreValue: (hovered: boolean): React.CSSProperties => ({
      fontSize:      '22px',
      fontWeight:    900,
      fontStyle:     'italic',
      letterSpacing: '-0.03em',
      color:         hovered ? TOKEN.red : TOKEN.white,
      transition:    'color 0.2s',
    }),

    scoreUnit: {
      fontSize: '10px',
      fontStyle: 'normal',
      color:     TOKEN.muted,
      marginLeft: '2px',
    } as React.CSSProperties,

    scoreDate: {
      fontSize:      '9px',
      color:         TOKEN.muted,
      fontWeight:    700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.12em',
      marginTop:     '2px',
    } as React.CSSProperties,

    // Empty state
    emptyState: {
      padding:      '80px 20px',
      textAlign:    'center' as const,
      border:       `1px dashed ${TOKEN.border}`,
      borderRadius: '16px',
      background:   TOKEN.card,
    } as React.CSSProperties,

    // User card
    userCard: {
      marginTop:      '48px',
      padding:        '24px',
      borderRadius:   '16px',
      background:     'rgba(255,23,68,0.05)',
      border:         `1px solid rgba(255,23,68,0.20)`,
      backdropFilter: 'blur(16px)',
      display:        'flex',
      flexWrap:       'wrap' as const,
      alignItems:     'center',
      justifyContent: 'space-between',
      gap:            '24px',
      position:       'relative' as const,
      overflow:       'hidden',
    } as React.CSSProperties,

    btnWhite: {
      background:    TOKEN.white,
      color:         '#000',
      border:        'none',
      padding:       '14px 40px',
      borderRadius:  '6px',
      fontWeight:    900,
      fontSize:      '12px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      cursor:        'pointer',
      transition:    'background 0.2s, color 0.2s',
      boxShadow:     '0 0 20px rgba(255,255,255,0.10)',
    } as React.CSSProperties,
  };

  return (
    <>
      {/* ── Global styles: use shared CSS variables from globals.css ──────── */}
      <style>{`
        /* Use fonts from main website */
        body {
          background: var(--dark);
          font-family: var(--font-body), sans-serif;
          color: var(--text);
        }

        /* Selection */
        ::selection { background: var(--red); color: #fff; }

        /* Scrollbar */
        ::-webkit-scrollbar       { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--dark); }
        ::-webkit-scrollbar-thumb { background: rgba(255,23,68,0.4); border-radius: 3px; }

        /* Animations */
        @keyframes scan {
          from { top: -2px; }
          to   { top: 100%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }

        .animate-pulse        { animation: pulse 2s ease-in-out infinite; }
        .animate-ping         { animation: ping  1s cubic-bezier(0,0,0.2,1) infinite; }
        .animate-bounce-subtle { animation: bounce-subtle 3s ease-in-out infinite; }
        .animate-spin         { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Scan line */
        .scan-line {
          position:   fixed;
          left: 0; right: 0;
          height:     2px;
          background: linear-gradient(90deg, transparent, rgba(255,23,68,0.25), transparent);
          animation:  scan 12s linear infinite;
          pointer-events: none;
          z-index: 50;
        }

        /* CRT overlay */
        .crt-overlay {
          position:   fixed;
          inset:      0;
          background:
            linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.18) 50%),
            linear-gradient(90deg, rgba(255,0,0,0.02), rgba(0,255,0,0.01), rgba(0,0,255,0.02));
          background-size: 100% 2px, 3px 100%;
          pointer-events: none;
          z-index: 50;
        }

        /* Radial glow */
        .bg-glow {
          position:   fixed;
          inset:      0;
          background: radial-gradient(circle at 50% -15%, rgba(255,23,68,0.18) 0%, transparent 55%);
          pointer-events: none;
        }

        /* Input focus */
        .search-input:focus {
          border-color: rgba(255,23,68,0.50) !important;
          background:   rgba(255,255,255,0.08) !important;
        }
        .search-input::placeholder { color: #4b5563; }

        /* Btn hover helpers */
        .btn-primary:hover:not(:disabled) { background: ${TOKEN.redDim} !important; }
        .btn-primary:disabled             { opacity: 0.5; cursor: not-allowed; }
        .btn-ghost:hover                  { color: #fff !important; }
        .btn-white:hover  { background: ${TOKEN.red} !important; color: #fff !important; }

        /* Row hover border */
        .rank-row:hover { border-color: rgba(255,23,68,0.40) !important; }
      `}</style>

      {/* ── Background FX ──────────────────────────────────────────────────── */}
      <div className="bg-glow" />
      <div className="crt-overlay" />
      <div className="scan-line" />

      {/* 🔥 ROUND 2 RESULTS SCREEN - Shows before leaderboard */}
      {showResults && isRound2Game && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 5, 9, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: 'var(--card)',
            border: '2px solid var(--red)',
            borderRadius: '16px',
            padding: '48px 32px',
            maxWidth: '600px',
            width: '90%',
            boxShadow: '0 0 60px rgba(255,23,68,0.4)',
            animation: 'slideUp 0.4s ease-out',
            textAlign: 'center',
          }}>
            {/* Icon */}
            <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'pulse 2s infinite' }}>
              🎮
            </div>

            {/* Title */}
            <h2 style={{
              fontFamily: 'var(--font-head)',
              fontSize: '36px',
              fontWeight: 'bold',
              color: 'var(--cyan)',
              margin: '0 0 16px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}>
              ROUND 2 COMPLETE!
            </h2>

            {/* Info Box */}
            <div style={{
              background: 'rgba(255,23,68,0.1)',
              border: '2px solid var(--red)',
              borderRadius: '12px',
              padding: '32px',
              marginBottom: '32px',
            }}>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                color: 'var(--cyan)',
                margin: '0 0 16px',
                letterSpacing: '1px',
              }}>
                ✅ YOU SUCCESSFULLY IDENTIFIED & REPORTED THE SCAMMER
              </p>
              
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: 'var(--red)',
                margin: '0 0 16px',
              }}>
                +40 PTS
              </div>

              <p style={{
                color: 'rgba(255,255,255,0.7)',
                margin: '0',
                fontSize: '14px',
                lineHeight: 1.6,
              }}>
                Your quick thinking prevented scams and protected others. You're a true ScamEscape agent! 🛡️
              </p>
            </div>

            {/* Continue Button */}
            <button
              onClick={() => setShowResults(false)}
              style={{
                background: 'linear-gradient(135deg, var(--red), #ff5577)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '16px 32px',
                fontFamily: 'var(--font-head)',
                fontSize: '14px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 0 20px rgba(255,23,68,0.3)',
              }}
              onMouseEnter={e => {
                (e.target as HTMLButtonElement).style.boxShadow = '0 0 40px rgba(255,23,68,0.6)'
                ;(e.target as HTMLButtonElement).style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(255,23,68,0.3)'
                ;(e.target as HTMLButtonElement).style.transform = 'translateY(0)'
              }}
            >
              🏆 VIEW LEADERBOARD
            </button>
          </div>
        </div>
      )}

      <div style={S.page}>

        {/* ── Navbar is now handled by parent page component ─────────────────────────────────────────────────────── */}

        {/* ── Main Content ─────────────────────────────────────────────────────── */}
        <main style={S.main}>

          {/* Header */}
          <header style={S.header}>
            <div style={S.statusBadge}>
              <span
                className={isSimulating ? 'animate-ping' : 'animate-pulse'}
                style={S.statusDot(isSimulating)}
              />
              {isSimulating ? 'Processing Simulation…' : 'System Online — All Nodes Active'}
            </div>

            <h1 style={S.h1}>
              <span style={{ background: 'linear-gradient(to bottom, #fff 30%, #6b7280)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                🏆 LEADER
              </span>
              <span style={S.h1Accent}>BOARD</span>
            </h1>

            <p style={S.subtitle}>Top Agents Ranked by Scam Detection Skill</p>
          </header>

          {/* Filter bar */}
          <div style={S.filterBar}>
            <div style={S.filterGroup}>
              {['All', 'Easy', 'Medium', 'Hard'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setFilter(lvl)}
                  style={S.filterBtn(filter === lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <div style={S.searchWrap}>
              <span style={S.searchIcon}><Search size={14} /></span>
              <input
                className="search-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search agent codename…"
                style={S.searchInput}
              />
            </div>
          </div>

          {/* 🔥 JOIN THE GAME CTA - Prominent Section */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,23,68,0.15) 0%, rgba(255,100,100,0.08) 100%)',
            border: `2px solid ${TOKEN.red}`,
            borderRadius: '16px',
            padding: '32px 24px',
            marginBottom: '32px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Glow effect */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'radial-gradient(circle at center, rgba(255,23,68,0.1), transparent)',
              pointerEvents: 'none',
            }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Play size={24} style={{ color: TOKEN.red, fill: TOKEN.red }} />
                <h2 style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}>
                  Ready to Test Your Skills?
                </h2>
              </div>
              
              <p style={{
                fontSize: '14px',
                color: TOKEN.muted,
                marginBottom: '20px',
                maxWidth: '600px',
              }}>
                Join the game and compete against other agents. Spot the scams, survive the schemes, and climb the leaderboard. Every challenge earns you points and reputation.
              </p>
              
              <button
                onClick={startNewGame}
                style={{
                  background: `linear-gradient(135deg, ${TOKEN.red}, #ff5577)`,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '16px 32px',
                  fontSize: '14px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: `0 0 20px ${TOKEN.redGlow}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLButtonElement).style.boxShadow = `0 0 40px ${TOKEN.redGlow}`;
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLButtonElement).style.boxShadow = `0 0 20px ${TOKEN.redGlow}`;
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                <Play size={18} />
                Join the Game Now
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          {/* Current Game Result (if coming from game completion) */}
          {currentPlayerResult && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(0,230,118,0.15) 0%, rgba(0,100,50,0.08) 100%)',
              border: `2px solid #00e676`,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'radial-gradient(circle at center, rgba(0,230,118,0.1), transparent)',
                pointerEvents: 'none',
              }} />
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                  marginBottom: '16px',
                  color: '#00e676',
                }}>
                  ✅ Your Recent Game Result
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '16px',
                }}>
                  <div>
                    <p style={{ fontSize: '10px', color: TOKEN.muted, textTransform: 'uppercase', marginBottom: '4px' }}>
                      Total Score
                    </p>
                    <p style={{
                      fontSize: '24px',
                      fontWeight: 900,
                      color: '#00e676',
                    }}>
                      {currentPlayerResult.total_score}
                    </p>
                  </div>
                  
                  <div>
                    <p style={{ fontSize: '10px', color: TOKEN.muted, textTransform: 'uppercase', marginBottom: '4px' }}>
                      Round 1
                    </p>
                    <p style={{
                      fontSize: '20px',
                      fontWeight: 900,
                      color: '#00e676',
                    }}>
                      {currentPlayerResult.round1_score}
                    </p>
                  </div>
                  
                  <div>
                    <p style={{ fontSize: '10px', color: TOKEN.muted, textTransform: 'uppercase', marginBottom: '4px' }}>
                      Round 2
                    </p>
                    <p style={{
                      fontSize: '20px',
                      fontWeight: 900,
                      color: currentPlayerResult.round2_score === 0 ? '#ff5252' : '#00e676',
                    }}>
                      {currentPlayerResult.round2_score}
                      {currentPlayerResult.round2_score === 0 && ' (Scammed)'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sorted.length > 0 ? sorted.map(agent => (
              <div
                key={agent.id}
                className="rank-row"
                onMouseEnter={() => setHoveredId(agent.id!)}
                onMouseLeave={() => setHoveredId(null)}
                style={S.row(agent.rank!, hoveredId === agent.id)}
              >
                {/* Rank */}
                <div style={S.rankCol}>
                  {agent.rank === 1 ? (
                    <div className="animate-bounce-subtle" style={{ display: 'inline-block' }}>
                      <Crown
                        size={30}
                        style={{ color: '#facc15', filter: 'drop-shadow(0 0 8px rgba(234,179,8,0.8))' }}
                      />
                    </div>
                  ) : agent.rank! <= 3 ? (
                    <div style={{
                      width: '32px', height: '32px', margin: '0 auto',
                      borderRadius: '50%',
                      border: '2px solid currentColor',
                      background: 'rgba(0,0,0,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 900,
                      color: agent.rank === 2 ? '#94a3b8' : '#d97706',
                    }}>
                      {agent.rank}
                    </div>
                  ) : (
                    <span style={S.rankNumber(agent.rank!)}>#{agent.rank}</span>
                  )}
                </div>

                {/* Avatar + info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexGrow: 1, minWidth: 0 }}>
                  <div style={S.agentAvatar(agent.rank! <= 3)}>
                    <img
                      src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${agent.codename}`}
                      alt="avatar"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                  <div style={{ overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={S.codename}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {agent.codename}
                      </span>
                      {agent.rank === 1 && (
                        <Zap size={12} style={{ color: '#fde047', fill: '#fde047', flexShrink: 0 }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px', flexWrap: 'wrap' }}>
                      <span style={S.badge(agent.difficulty)}>{agent.difficulty}</span>
                      <span style={S.accLabel}>
                        <Target size={11} style={{ color: TOKEN.cyan }} />
                        Acc: <span style={{ color: TOKEN.white }}>{agent.accuracy}%</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div style={S.scoreCol}>
                  <div style={S.scoreValue(hoveredId === agent.id)}>
                    {agent.score.toLocaleString()}
                    <span style={S.scoreUnit}>XP</span>
                  </div>
                  {/* Show Round 1 and Round 2 breakdown if available */}
                  {(agent.round1_score !== undefined || agent.round2_score !== undefined) && (
                    <div style={{ fontSize: '10px', color: TOKEN.muted, marginTop: '4px', lineHeight: 1.3 }}>
                      {agent.round1_score !== undefined && (
                        <div>R1: <span style={{ color: '#00e676' }}>{agent.round1_score}</span></div>
                      )}
                      {agent.round2_score !== undefined && (
                        <div>R2: <span style={{ color: agent.round2_score === 0 ? '#ff5252' : '#00e676' }}>{agent.round2_score}</span></div>
                      )}
                    </div>
                  )}
                  <div style={S.scoreDate}>
                    {new Date(agent.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRight
                  size={18}
                  style={{
                    color:      TOKEN.red,
                    opacity:    hoveredId === agent.id ? 1 : 0,
                    transition: 'opacity 0.2s',
                    flexShrink: 0,
                  }}
                />
              </div>
            )) : (
              <div style={S.emptyState}>
                <AlertTriangle size={44} style={{ color: '#374151', margin: '0 auto 16px' }} />
                <p style={{ color: TOKEN.muted, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', fontSize: '12px' }}>
                  No agents detected matching query
                </p>
                <button
                  onClick={() => { setFilter('All'); setSearchQuery(''); }}
                  style={{
                    marginTop:  '12px', background: 'none', border: 'none',
                    color:       TOKEN.red, fontSize: '11px', fontWeight: 900,
                    textTransform: 'uppercase', textDecoration: 'underline',
                    cursor:     'pointer', letterSpacing: '0.10em',
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>

          {/* User card */}
          {(() => {
            const currentAgent = playerId ? agents.find(a => a.id === playerId) : null;
            const userRank = currentAgent?.rank || agents.length + 1;
            const userCodename = currentAgent?.codename || 'NEW_AGENT';
            const userScore = currentAgent?.score || 0;
            const userAccuracy = currentAgent?.accuracy || 0;
            
            return (
              <div style={S.userCard}>
                {/* Top shimmer line */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                  background: `linear-gradient(90deg, transparent, rgba(255,23,68,0.5), transparent)`,
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '9px', color: TOKEN.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>
                      Your Rank
                    </span>
                    <span style={{ fontSize: '40px', fontWeight: 900, fontStyle: 'italic', textShadow: `0 0 12px ${TOKEN.red}` }}>
                      #{userRank}
                    </span>
                  </div>

                  <div style={{ width: '1px', height: '48px', background: TOKEN.border }} />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        {userCodename}
                      </span>
                      <span
                        className="animate-pulse"
                        style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: TOKEN.red, color: '#fff',
                          fontSize: '8px', fontWeight: 900,
                          textTransform: 'uppercase', letterSpacing: '0.10em',
                        }}
                      >
                        Active
                      </span>
                    </div>
                    <p style={{ fontSize: '10px', color: TOKEN.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      Score: <span style={{ color: TOKEN.white, fontWeight: 700 }}>{userScore.toLocaleString()}</span>
                      {' '}— Accuracy: <span style={{ color: TOKEN.cyan, fontWeight: 700 }}>{userAccuracy}%</span>
                    </p>
                  </div>
                </div>

                <button
                  className="btn-white"
                  onClick={startNewGame}
                  style={S.btnWhite}
                >
                  🎮 Start New Game
                </button>
              </div>
            );
          })()}

        </main>
      </div>
    </>
  );
}