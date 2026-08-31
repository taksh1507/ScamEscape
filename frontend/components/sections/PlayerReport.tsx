'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────
interface RoundResult {
  round: number
  title: string
  icon: string
  decision: string
  correct: boolean
  score: number
  maxScore: number
  proTip: string
}

// ─── Mock data — replace with real state/props from your simulation ───────────
const MOCK_RESULTS: RoundResult[] = [
  {
    round: 1,
    title: 'Phone Call Scam',
    icon: '📞',
    decision: 'Stayed on call and shared OTP',
    correct: false,
    score: 4,
    maxScore: 10,
    proTip: 'Real banks NEVER ask for OTP over a call. If someone claiming to be from your bank asks for OTP, hang up immediately and call the official bank helpline printed on your card.',
  },
  {
    round: 2,
    title: 'WhatsApp PDF Scam',
    icon: '💬',
    decision: 'Deleted the message and blocked the sender',
    correct: true,
    score: 10,
    maxScore: 10,
    proTip: 'You nailed this one. Always verify unexpected attachments by calling the sender on their official number before opening any file.',
  },
  {
    round: 3,
    title: 'SMS Phishing Link',
    icon: '📱',
    decision: 'Called bank directly to verify',
    correct: true,
    score: 6,
    maxScore: 10,
    proTip: 'Good instinct calling the bank — but the safest move is to delete without any interaction and report to 1930. Even calling can confirm your number is active to scammers.',
  },
]

const TOTAL_SCORE   = MOCK_RESULTS.reduce((a, r) => a + r.score, 0)
const TOTAL_MAX     = MOCK_RESULTS.reduce((a, r) => a + r.maxScore, 0)
const CORRECT_COUNT = MOCK_RESULTS.filter(r => r.correct).length
const WRONG_COUNT   = MOCK_RESULTS.filter(r => !r.correct).length
const PERCENTAGE    = Math.round((TOTAL_SCORE / TOTAL_MAX) * 100)

function getOverallGrade(pct: number) {
  if (pct >= 90) return { letter: 'A+', color: '#00e676', label: 'EXPERT LEVEL' }
  if (pct >= 75) return { letter: 'A',  color: '#00e5ff', label: 'WELL TRAINED' }
  if (pct >= 50) return { letter: 'B',  color: '#ffb700', label: 'NEEDS PRACTICE' }
  return           { letter: 'F',  color: '#ff1744', label: 'HIGH RISK PLAYER' }
}

const GRADE = getOverallGrade(PERCENTAGE)

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return <>{count}</>
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlayerReport() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes scoreReveal {
          from { opacity:0; transform:scale(0.4); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes barFill {
          from { width:0%; }
          to   { width:var(--w); }
        }
        @keyframes pulse {
          0%,100% { opacity:1; } 50% { opacity:0.5; }
        }
        @keyframes scanline {
          0%   { transform:translateY(-100%); }
          100% { transform:translateY(100vh); }
        }
        .round-card {
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .round-card:hover {
          transform: translateX(6px);
        }
        .btn-primary:hover {
          background: #ff3d5a !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255,23,68,0.3) !important;
        }
        .btn-secondary:hover {
          border-color: rgba(255,255,255,0.3) !important;
          color: #fff !important;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#05050f',
        color: '#fff',
        fontFamily: 'var(--font-body, sans-serif)',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Scanline effect */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(255,23,68,0.3), transparent)',
          animation: 'scanline 4s linear infinite',
          zIndex: 0, pointerEvents: 'none',
        }} />

        {/* Grid background */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(rgba(255,23,68,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,23,68,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }} />

        {/* Navbar */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '68px',
          background: 'rgba(5,5,9,0.94)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 36px',
        }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <div style={{
              width: '34px', height: '34px', border: '2px solid #ff1744',
              borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,23,68,0.08)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff1744">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5L20 8.5v7L12 19.5 4 15.5v-7L12 4.5zM12 7a3 3 0 100 6 3 3 0 000-6z"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-head, monospace)', fontSize: '18px', letterSpacing: '3px', color: '#fff' }}>
              Scam<span style={{ color: '#ff1744' }}>Escape</span>
            </span>
          </a>
          <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px' }}>
            PERFORMANCE REPORT
          </div>
          <a href="/" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none', letterSpacing: '2px' }}>
            ← HOME
          </a>
        </div>

        {/* Main content */}
        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: '720px', margin: '0 auto',
          padding: '100px 24px 80px',
        }}>

          {/* Header */}
          <div style={{
            textAlign: 'center', marginBottom: '48px',
            opacity: visible ? 1 : 0,
            animation: visible ? 'fadeUp 0.5s ease both' : 'none',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono, monospace)', fontSize: '10px',
              color: 'rgba(255,255,255,0.25)', letterSpacing: '4px', marginBottom: '16px',
            }}>
              SIMULATION COMPLETE · ALL ROUNDS DONE
            </div>
            <div style={{
              fontFamily: 'var(--font-head, monospace)', fontSize: '32px',
              letterSpacing: '4px', color: '#fff', marginBottom: '4px',
            }}>
              YOUR <span style={{ color: '#ff1744' }}>REPORT</span>
            </div>
          </div>

          {/* ── Overall Score Card ── */}
          <div style={{
            background: `linear-gradient(135deg, ${GRADE.color}08, transparent)`,
            border: `1px solid ${GRADE.color}33`,
            borderRadius: '16px', padding: '32px',
            marginBottom: '32px', textAlign: 'center',
            animation: visible ? 'fadeUp 0.5s 0.1s ease both' : 'none',
            opacity: visible ? 1 : 0,
          }}>
            {/* Grade */}
            <div style={{
              fontFamily: 'var(--font-head, monospace)',
              fontSize: '96px', lineHeight: 1,
              color: GRADE.color,
              textShadow: `0 0 60px ${GRADE.color}55`,
              animation: visible ? 'scoreReveal 0.7s 0.3s ease both' : 'none',
              opacity: visible ? 1 : 0,
              marginBottom: '8px',
            }}>
              {GRADE.letter}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono, monospace)', fontSize: '11px',
              color: GRADE.color, letterSpacing: '4px', marginBottom: '28px',
            }}>
              {GRADE.label}
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>

              {/* Total Score */}
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', padding: '16px 24px', minWidth: '120px',
              }}>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', marginBottom: '8px' }}>
                  TOTAL SCORE
                </div>
                <div style={{ fontFamily: 'var(--font-head, monospace)', fontSize: '36px', color: GRADE.color, lineHeight: 1 }}>
                  <Counter target={TOTAL_SCORE} />
                  <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)' }}>/{TOTAL_MAX}</span>
                </div>
              </div>

              {/* Correct */}
              <div style={{
                background: 'rgba(0,230,118,0.05)',
                border: '1px solid rgba(0,230,118,0.2)',
                borderRadius: '12px', padding: '16px 24px', minWidth: '120px',
              }}>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', color: '#00e676', letterSpacing: '2px', marginBottom: '8px' }}>
                  ✓ CORRECT
                </div>
                <div style={{ fontFamily: 'var(--font-head, monospace)', fontSize: '36px', color: '#00e676', lineHeight: 1 }}>
                  <Counter target={CORRECT_COUNT} />
                  <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)' }}>/{MOCK_RESULTS.length}</span>
                </div>
              </div>

              {/* Wrong */}
              <div style={{
                background: 'rgba(255,23,68,0.05)',
                border: '1px solid rgba(255,23,68,0.2)',
                borderRadius: '12px', padding: '16px 24px', minWidth: '120px',
              }}>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', color: '#ff1744', letterSpacing: '2px', marginBottom: '8px' }}>
                  ✗ WRONG
                </div>
                <div style={{ fontFamily: 'var(--font-head, monospace)', fontSize: '36px', color: '#ff1744', lineHeight: 1 }}>
                  <Counter target={WRONG_COUNT} />
                  <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)' }}>/{MOCK_RESULTS.length}</span>
                </div>
              </div>

              {/* Accuracy */}
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', padding: '16px 24px', minWidth: '120px',
              }}>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', marginBottom: '8px' }}>
                  ACCURACY
                </div>
                <div style={{ fontFamily: 'var(--font-head, monospace)', fontSize: '36px', color: GRADE.color, lineHeight: 1 }}>
                  <Counter target={PERCENTAGE} />
                  <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)' }}>%</span>
                </div>
              </div>
            </div>

            {/* Overall progress bar */}
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${PERCENTAGE}%`,
                background: `linear-gradient(90deg, ${GRADE.color}88, ${GRADE.color})`,
                borderRadius: '3px',
                boxShadow: `0 0 12px ${GRADE.color}`,
                transition: 'width 1.5s ease',
              }} />
            </div>
          </div>

          {/* ── Round by Round Breakdown ── */}
          <div style={{
            fontFamily: 'var(--font-mono, monospace)', fontSize: '10px',
            color: 'rgba(255,255,255,0.25)', letterSpacing: '3px',
            marginBottom: '16px',
            animation: visible ? 'fadeUp 0.5s 0.3s ease both' : 'none',
            opacity: visible ? 1 : 0,
          }}>
            ROUND BY ROUND BREAKDOWN
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
            {MOCK_RESULTS.map((r, i) => {
              const pct = Math.round((r.score / r.maxScore) * 100)
              const color = r.correct ? '#00e676' : '#ff1744'
              return (
                <div
                  key={r.round}
                  className="round-card"
                  style={{
                    background: r.correct ? 'rgba(0,230,118,0.04)' : 'rgba(255,23,68,0.04)',
                    border: `1px solid ${color}22`,
                    borderLeft: `3px solid ${color}`,
                    borderRadius: '12px',
                    padding: '20px 24px',
                    animation: visible ? `fadeUp 0.5s ${0.4 + i * 0.1}s ease both` : 'none',
                    opacity: visible ? 1 : 0,
                  }}
                >
                  {/* Round header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '24px' }}>{r.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px',
                        }}>
                          ROUND {r.round}
                        </span>
                        <span style={{
                          background: r.correct ? 'rgba(0,230,118,0.15)' : 'rgba(255,23,68,0.15)',
                          border: `1px solid ${color}44`,
                          borderRadius: '4px', padding: '1px 8px',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '9px', color, letterSpacing: '1px',
                        }}>
                          {r.correct ? '✓ CORRECT' : '✗ WRONG'}
                        </span>
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-body, sans-serif)',
                        fontSize: '15px', fontWeight: 600, color: '#fff',
                      }}>
                        {r.title}
                      </div>
                    </div>
                    {/* Score */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-head, monospace)',
                        fontSize: '28px', color, lineHeight: 1,
                      }}>
                        {r.score}
                        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>/{r.maxScore}</span>
                      </div>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginBottom: '14px' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}66, ${color})`,
                      borderRadius: '2px', boxShadow: `0 0 8px ${color}`,
                      transition: 'width 1s ease',
                    }} />
                  </div>

                  {/* What user did */}
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px', padding: '10px 14px',
                    marginBottom: '12px',
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '2px', marginBottom: '4px' }}>
                      YOUR DECISION
                    </div>
                    <div style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                      "{r.decision}"
                    </div>
                  </div>

                  {/* Pro tip — only show if wrong */}
                  {!r.correct && (
                    <div style={{
                      background: 'rgba(255,183,0,0.06)',
                      border: '1px solid rgba(255,183,0,0.2)',
                      borderRadius: '8px', padding: '12px 14px',
                      display: 'flex', gap: '10px', alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>💡</span>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '9px', color: '#ffb700', letterSpacing: '2px', marginBottom: '4px' }}>
                          PRO TIP
                        </div>
                        <div style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
                          {r.proTip}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pro tip for correct but not perfect */}
                  {r.correct && r.score < r.maxScore && (
                    <div style={{
                      background: 'rgba(0,229,255,0.06)',
                      border: '1px solid rgba(0,229,255,0.2)',
                      borderRadius: '8px', padding: '12px 14px',
                      display: 'flex', gap: '10px', alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>🎯</span>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '9px', color: '#00e5ff', letterSpacing: '2px', marginBottom: '4px' }}>
                          GOOD — BUT HERE'S HOW TO BE PERFECT
                        </div>
                        <div style={{ fontFamily: 'var(--font-body, sans-serif)', fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
                          {r.proTip}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── CTA Buttons ── */}
          <div style={{
            display: 'flex', gap: '14px', flexWrap: 'wrap',
            animation: visible ? 'fadeUp 0.5s 0.7s ease both' : 'none',
            opacity: visible ? 1 : 0,
          }}>
            <button
              className="btn-primary"
              onClick={() => router.push('/leaderboard')}
              style={{
                flex: 1, minWidth: '200px',
                background: '#ff1744', color: '#fff', border: 'none',
                padding: '16px 24px',
                fontFamily: 'var(--font-body, sans-serif)',
                fontSize: '14px', fontWeight: 700, letterSpacing: '3px',
                textTransform: 'uppercase', cursor: 'pointer',
                borderRadius: '8px', transition: 'all 0.3s',
                clipPath: 'polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)',
              }}
            >
              VIEW LEADERBOARD →
            </button>
            <button
              className="btn-secondary"
              onClick={() => router.push('/simulation/call')}
              style={{
                flex: 1, minWidth: '160px',
                background: 'transparent', color: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '16px 24px',
                fontFamily: 'var(--font-body, sans-serif)',
                fontSize: '14px', fontWeight: 600, letterSpacing: '2px',
                textTransform: 'uppercase', cursor: 'pointer',
                borderRadius: '8px', transition: 'all 0.3s',
                clipPath: 'polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)',
              }}
            >
              RETRY ↺
            </button>
          </div>

        </div>
      </div>
    </>
  )
}