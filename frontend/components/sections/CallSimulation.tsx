'use client'

import { useState, useEffect, useRef } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────
type CallPhase = 'incoming' | 'active' | 'decision' | 'result'
type DecisionKey = 'share' | 'hang_up' | 'ask_questions' | 'call_back'

interface Decision {
  id: DecisionKey
  label: string
  sub: string
  risk: 'safe' | 'neutral' | 'danger'
}

// ─── Static Data ──────────────────────────────────────────────────────────────
const CALLER_INFO = {
  name: 'AMAZON SUPPORT',
  number: '+1 (800) 555-0192',
  avatar: 'AM',
}

const CALL_SCRIPT = [
  { speaker: 'CALLER', text: "Hello, am I speaking with the account holder?" },
  { speaker: 'CALLER', text: "This is John from Amazon Customer Support. We've detected suspicious activity on your account." },
  { speaker: 'CALLER', text: "Your account has been temporarily locked. To restore access, I'll need to verify your identity." },
  { speaker: 'CALLER', text: "Could you please confirm your full name, address, and the last 4 digits of your card on file?" },
]

const DECISIONS: Decision[] = [
  { id: 'share',         label: 'PROVIDE INFORMATION',  sub: 'Share name, address & card digits',   risk: 'danger'  },
  { id: 'hang_up',       label: 'HANG UP',              sub: 'End the call immediately',            risk: 'safe'    },
  { id: 'ask_questions', label: 'ASK FOR VERIFICATION', sub: "Request their employee ID & dept",    risk: 'neutral' },
  { id: 'call_back',     label: 'CALL BACK OFFICIALLY', sub: "Hang up & call Amazon's real number", risk: 'safe'    },
]
const RED_FLAGS: RedFlag[] = [
  { text: 'Unsolicited call claiming to be from a known company' },
  { text: "Urgency — account 'locked' requiring immediate action" },
  { text: 'Requesting sensitive personal & financial information' },
  { text: 'Caller provides no verifiable employee details' },
  { text: 'Spoofed number mimicking a legitimate company line' },
]
// Points per choice
const POINTS: Record<DecisionKey, number> = {
  hang_up:       10,
  call_back:      8,
  ask_questions:  6,
  share:          0,
}

// Grade label per choice
const GRADE: Record<DecisionKey, { letter: string; color: string; label: string }> = {
  hang_up:       { letter: 'A+', color: '#00e676', label: 'PERFECT RESPONSE'   },
  call_back:     { letter: 'A',  color: '#00e5ff', label: 'STRONG RESPONSE'    },
  ask_questions: { letter: 'B',  color: '#ffb700', label: 'PARTIAL RESPONSE'   },
  share:         { letter: 'F',  color: '#ff1744', label: 'CRITICAL FAILURE'   },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WaveBar({ delay }: { delay: number }) {
  return (
    <div style={{
      width: '3px',
      background: 'var(--red)',
      borderRadius: '2px',
      height: '100%',
      animation: `waveAnim 0.8s ${delay}s ease-in-out infinite alternate`,
    }} />
  )
}

function CallTimer({ active }: { active: boolean }) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [active])
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#00e676', letterSpacing: '2px' }}>
      {mm}:{ss}
    </span>
  )
}

function ScriptLine({ text, speaker, visible }: { text: string; speaker: string; visible: boolean }) {
  const [displayed, setDisplayed] = useState('')
  const idxRef = useRef(0)

  useEffect(() => {
    if (!visible) return
    idxRef.current = 0
    setDisplayed('')
    const id = setInterval(() => {
      if (idxRef.current < text.length) {
        setDisplayed(text.slice(0, idxRef.current + 1))
        idxRef.current++
      } else {
        clearInterval(id)
      }
    }, 28)
    return () => clearInterval(id)
  }, [visible, text])

  if (!visible) return null

  return (
    <div style={{
      padding: '14px 18px',
      background: 'rgba(255,23,68,0.06)',
      border: '1px solid rgba(255,23,68,0.15)',
      marginBottom: '10px',
      animation: 'fadeSlideUp 0.4s ease both',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '9px',
        color: 'var(--red)', letterSpacing: '3px', marginBottom: '6px',
      }}>
         {speaker}
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
        &ldquo;{displayed}
        <span style={{
          display: 'inline-block', width: '2px', height: '14px',
          background: 'var(--red)', verticalAlign: 'middle', marginLeft: '2px',
          animation: 'blink 0.8s infinite',
        }} />
        &rdquo;
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CallSimulation() {
  const router = useRouter()

  const [phase, setPhase]             = useState<CallPhase>('incoming')
  const [scriptIndex, setScriptIndex] = useState(0)
  const [decision, setDecision]       = useState<DecisionKey | null>(null)
  const scriptRef                     = useRef<HTMLDivElement>(null)

  // Auto-advance call script lines
  useEffect(() => {
    if (phase !== 'active') return
    if (scriptIndex >= CALL_SCRIPT.length) {
      const t = setTimeout(() => setPhase('decision'), 1200)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setScriptIndex(i => i + 1), 2800)
    return () => clearTimeout(t)
  }, [phase, scriptIndex])

  // Auto-scroll transcript
  useEffect(() => {
    scriptRef.current?.scrollTo({ top: 9999, behavior: 'smooth' })
  }, [scriptIndex])

  const handleAnswer = () => {
    setPhase('active')
    setScriptIndex(0)
    setTimeout(() => setScriptIndex(1), 600)
  }

  const handleDecline = () => {
    // Declining without answering = hang_up level response
    setDecision('hang_up')
    setPhase('result')
  }

  const handleDecision = (id: DecisionKey) => {
    setDecision(id)
    setPhase('result')
  }

  const handleRetry = () => {
    setPhase('incoming')
    setDecision(null)
    setScriptIndex(0)
  }

  // Navigate to next simulation (placeholder route — swap when ready)
  const handleContinue = () => {
    router.push('/simulation/next')
  }

  const grade  = decision ? GRADE[decision]  : null
  const points = decision ? POINTS[decision] : 0

  return (
    <>
      {/* ── Keyframes ── */}
      <style>{`
        @keyframes waveAnim {
          from { transform: scaleY(0.15); opacity: 0.4; }
          to   { transform: scaleY(1);    opacity: 1;   }
        }
        @keyframes ringPulse {
          0%   { transform: scale(1);    opacity: 0.8; }
          50%  { transform: scale(1.18); opacity: 0.2; }
          100% { transform: scale(1.36); opacity: 0;   }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0; }
        }
        @keyframes scanline {
          0%   { top: -4px; }
          100% { top: 100%; }
        }
        @keyframes scoreReveal {
          from { opacity: 0; transform: scale(0.5) translateY(10px); }
          to   { opacity: 1; transform: scale(1)   translateY(0);    }
        }
        @keyframes pointsIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 24px 60px',
        position: 'relative', zIndex: 2,
      }}>

        {/* ── Top Navbar ── */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '72px',
          background: 'rgba(5,5,9,0.9)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 40px',
        }}>
          {/* Logo */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <div style={{
              width: '36px', height: '36px',
              border: '2px solid var(--red)', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,23,68,0.08)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--red)">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5L20 8.5v7L12 19.5 4 15.5v-7L12 4.5zM12 7a3 3 0 100 6 3 3 0 000-6z"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-head)', fontSize: '20px', letterSpacing: '3px', color: '#fff' }}>
              Fraud<span style={{ color: 'var(--red)' }}>Guard</span>
            </span>
          </a>

          {/* Centre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'var(--muted)', letterSpacing: '2px',
            }}>
              EASY — LEVEL 1 OF 3 — CALL SIMULATION
            </div>
            {phase === 'active' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(0,230,118,0.08)',
                border: '1px solid rgba(0,230,118,0.25)',
                padding: '6px 14px',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#00e676', animation: 'blink 1s infinite',
                }} />
                <CallTimer active={phase === 'active'} />
              </div>
            )}
          </div>

          {/* Exit */}
          <a
            href="/"
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'var(--muted)', letterSpacing: '2px',
              textDecoration: 'none', transition: 'color 0.3s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            ← EXIT
          </a>
        </div>

        {/* ══════════════════════════════════════════
            PHASE: INCOMING
        ══════════════════════════════════════════ */}
        {phase === 'incoming' && (
          <div style={{ textAlign: 'center', animation: 'fadeSlideUp 0.6s ease both' }}>

            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'var(--red)', letterSpacing: '3px', marginBottom: '40px',
            }}>
              INCOMING_CALL — EASY_LEVEL_01 — IDENTIFY THE SCAM
            </div>

            {/* Avatar with pulse rings */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '32px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: '120px', height: '120px',
                  border: '2px solid rgba(255,23,68,0.4)',
                  borderRadius: '50%',
                  transform: 'translate(-50%,-50%)',
                  animation: `ringPulse 2s ${i * 0.6}s ease-out infinite`,
                }} />
              ))}
              <div style={{
                width: '120px', height: '120px', borderRadius: '50%',
                background: 'rgba(255,23,68,0.12)',
                border: '2px solid var(--red)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-head)', fontSize: '32px',
                color: 'var(--red)', letterSpacing: '2px',
                position: 'relative', zIndex: 1,
              }}>
                {CALLER_INFO.avatar}
              </div>
            </div>

            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'var(--muted)', letterSpacing: '3px', marginBottom: '8px',
            }}>
              INCOMING CALL
            </div>
            <h2 style={{
              fontFamily: 'var(--font-head)', fontSize: '36px',
              letterSpacing: '4px', color: '#fff', marginBottom: '6px',
            }}>
              {CALLER_INFO.name}
            </h2>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '14px',
              color: 'var(--muted)', letterSpacing: '2px', marginBottom: '8px',
            }}>
              {CALLER_INFO.number}
            </div>
            <div style={{
              display: 'inline-block',
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              color: 'rgba(255,183,0,0.8)', letterSpacing: '2px',
              background: 'rgba(255,183,0,0.08)',
              border: '1px solid rgba(255,183,0,0.2)',
              padding: '4px 12px', marginBottom: '56px',
            }}>
              ⚠ UNVERIFIED CALLER
            </div>

            {/* Answer / Decline */}
            <div style={{ display: 'flex', gap: '48px', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={handleDecline}
                  style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'rgba(255,23,68,0.12)',
                    border: '2px solid var(--red)',
                    color: 'var(--red)', fontSize: '26px',
                    cursor: 'pointer', transition: 'all 0.3s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,23,68,0.28)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,23,68,0.12)' }}
                >
                  📵
                </button>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px',
                  color: 'var(--muted)', marginTop: '10px', letterSpacing: '2px',
                }}>
                  DECLINE
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={handleAnswer}
                  style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'rgba(0,230,118,0.12)',
                    border: '2px solid #00e676',
                    color: '#00e676', fontSize: '26px',
                    cursor: 'pointer', transition: 'background 0.3s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'ringPulse 2s 0.3s ease-out infinite',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,230,118,0.28)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,230,118,0.12)' }}
                >
                  📞
                </button>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px',
                  color: 'var(--muted)', marginTop: '10px', letterSpacing: '2px',
                }}>
                  ANSWER
                </div>
              </div>
            </div>

            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'rgba(255,255,255,0.12)', marginTop: '48px', letterSpacing: '1px',
            }}>
              training exercise — all calls are simulated
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════
            PHASE: ACTIVE CALL
        ══════════════════════════════════════════ */}
        {phase === 'active' && (
          <div style={{ width: '100%', maxWidth: '680px', animation: 'fadeSlideUp 0.5s ease both' }}>

            {/* Caller card */}
            <div style={{
              background: 'var(--card)',
              border: '1px solid rgba(0,230,118,0.3)',
              padding: '20px 24px', marginBottom: '24px',
              display: 'flex', alignItems: 'center', gap: '16px',
              clipPath: 'polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,0 100%)',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(0,230,118,0.1)',
                border: '2px solid #00e676',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-head)', fontSize: '16px', color: '#00e676',
              }}>
                {CALLER_INFO.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'var(--font-head)', fontSize: '18px',
                  letterSpacing: '2px', color: '#fff',
                }}>
                  {CALLER_INFO.name}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  color: 'var(--muted)', letterSpacing: '1px', marginTop: '2px',
                }}>
                  {CALLER_INFO.number}
                </div>
              </div>
              {/* Audio wave */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '28px' }}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <WaveBar key={i} delay={i * 0.12} />
                ))}
              </div>
            </div>

            {/* Transcript box */}
            <div style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              padding: '24px', marginBottom: '16px',
              minHeight: '260px', position: 'relative', overflow: 'hidden',
            }}>
              {/* Scanline */}
              <div style={{
                position: 'absolute', left: 0, right: 0, height: '2px',
                background: 'linear-gradient(90deg,transparent,rgba(255,23,68,0.15),transparent)',
                animation: 'scanline 3s linear infinite',
                pointerEvents: 'none',
              }} />
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '10px',
                color: 'var(--red)', letterSpacing: '3px', marginBottom: '16px',
              }}>
                LIVE_TRANSCRIPT — ANALYZING SPEECH PATTERNS
              </div>
              <div ref={scriptRef} style={{ maxHeight: '220px', overflowY: 'auto' }}>
                {CALL_SCRIPT.slice(0, scriptIndex).map((line, i) => (
                  <ScriptLine key={i} text={line.text} speaker={line.speaker} visible={i < scriptIndex} />
                ))}
                {scriptIndex < CALL_SCRIPT.length && (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '12px',
                    color: 'var(--muted)', letterSpacing: '2px', padding: '8px 0',
                  }}>
                    <span style={{ animation: 'blink 0.8s infinite', display: 'inline-block' }}>▋</span>
                    {' '}caller speaking...
                  </div>
                )}
              </div>
            </div>

            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'rgba(255,255,255,0.2)', textAlign: 'center', letterSpacing: '1px',
            }}>
               listen carefully — your decision prompt will appear shortly
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════
            PHASE: DECISION
        ══════════════════════════════════════════ */}
        {phase === 'decision' && (
          <div style={{ width: '100%', maxWidth: '720px', animation: 'fadeSlideUp 0.5s ease both' }}>

            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '11px',
                color: 'var(--red)', letterSpacing: '3px', marginBottom: '12px',
              }}>
                DECISION_REQUIRED — WHAT DO YOU DO?
              </div>
              <h2 style={{
                fontFamily: 'var(--font-head)',
                fontSize: 'clamp(28px,4vw,48px)',
                letterSpacing: '4px', color: '#fff', lineHeight: 1.1,
              }}>
                THE CALLER WANTS YOUR<br />
                <span style={{ color: 'var(--red)' }}>PERSONAL DATA</span>
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}>
              {DECISIONS.map(d => {
                const borderColor =
                  d.risk === 'safe'    ? '#00e676' :
                  d.risk === 'neutral' ? '#ffb700' : 'var(--red)'
                const bgColor =
                  d.risk === 'safe'    ? 'rgba(0,230,118,0.06)'  :
                  d.risk === 'neutral' ? 'rgba(255,183,0,0.06)'  : 'rgba(255,23,68,0.06)'

                return (
                  <button
                    key={d.id}
                    onClick={() => handleDecision(d.id)}
                    style={{
                      background: bgColor,
                      border: `1px solid ${borderColor}`,
                      padding: '24px 20px', textAlign: 'left',
                      cursor: 'pointer', transition: 'all 0.3s',
                      position: 'relative',
                      clipPath: 'polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.transform = 'translateY(-3px)'
                      el.style.boxShadow = `0 8px 24px ${borderColor}33`
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.transform = 'translateY(0)'
                      el.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: '14px', right: '14px',
                      width: '8px', height: '8px',
                      borderRadius: '50%', background: borderColor,
                    }} />
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: '13px',
                      fontWeight: 700, letterSpacing: '2px',
                      color: '#fff', textTransform: 'uppercase', marginBottom: '8px',
                    }}>
                      {d.label}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: '11px',
                      color: 'var(--muted)', letterSpacing: '1px',
                    }}>
                      {d.sub}
                    </div>
                  </button>
                )
              })}
            </div>

            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'rgba(255,255,255,0.2)', textAlign: 'center',
              marginTop: '24px', letterSpacing: '1px',
            }}>
              your choice is final — choose wisely, agent
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════
            PHASE: RESULT — score only, no feedback
        ══════════════════════════════════════════ */}
        {phase === 'result' && grade && (
          <div style={{
            width: '100%', maxWidth: '520px',
            textAlign: 'center',
            animation: 'fadeSlideUp 0.5s ease both',
          }}>

            {/* Level pill */}
            <div style={{
              display: 'inline-block',
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              color: 'var(--muted)', letterSpacing: '3px',
              border: '1px solid var(--border)',
              padding: '4px 14px', marginBottom: '40px',
            }}>
              EASY — LEVEL 1 OF 3
            </div>

            {/* Grade */}
            <div style={{
              fontFamily: 'var(--font-head)',
              fontSize: '100px', lineHeight: 1,
              color: grade.color,
              letterSpacing: '4px',
              textShadow: `0 0 40px ${grade.color}66`,
              animation: 'scoreReveal 0.7s 0.1s ease both',
              opacity: 0,
              animationFillMode: 'forwards',
            }}>
              {grade.letter}
            </div>

            {/* Label */}
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: grade.color, letterSpacing: '4px',
              marginTop: '12px', marginBottom: '32px',
              animation: 'pointsIn 0.5s 0.4s ease both',
              opacity: 0, animationFillMode: 'forwards',
            }}>
              {grade.label}
            </div>

            {/* Points card */}
            <div style={{
              background: 'var(--card)',
              border: `1px solid ${grade.color}44`,
              padding: '28px 36px',
              clipPath: 'polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))',
              marginBottom: '36px',
              animation: 'pointsIn 0.5s 0.55s ease both',
              opacity: 0, animationFillMode: 'forwards',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '10px',
                color: 'var(--muted)', letterSpacing: '3px', marginBottom: '16px',
              }}>
             POINTS AWARDED
              </div>
              <div style={{
                fontFamily: 'var(--font-head)',
                fontSize: '56px', color: grade.color,
                letterSpacing: '2px', lineHeight: 1,
              }}>
                +{points}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '11px',
                color: 'var(--muted)', letterSpacing: '2px', marginTop: '8px',
              }}>
                OUT OF 10 POSSIBLE POINTS
              </div>

              {/* Thin progress bar */}
              <div style={{
                height: '4px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '2px',
                overflow: 'hidden',
                marginTop: '20px',
              }}>
                <div style={{
                  height: '100%',
                  width: `${(points / 10) * 100}%`,
                  background: `linear-gradient(90deg,${grade.color}88,${grade.color})`,
                  borderRadius: '2px',
                  transition: 'width 1s ease',
                  boxShadow: `0 0 8px ${grade.color}`,
                }} />
              </div>
            </div>
            
            {/* Buttons */}
            <div style={{
              display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap',
              animation: 'pointsIn 0.5s 0.7s ease both',
              opacity: 0, animationFillMode: 'forwards',
            }}>
              {/* Continue → next simulation */}
              <button
                onClick={handleContinue}
                style={{
                  flex: 1, minWidth: '180px',
                  background: 'var(--red)', color: '#fff', border: 'none',
                  padding: '16px 24px',
                  fontFamily: 'var(--font-body)', fontSize: '14px',
                  fontWeight: 700, letterSpacing: '3px',
                  textTransform: 'uppercase', cursor: 'pointer',
                  clipPath: 'polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)',
                  transition: 'background 0.3s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--pink)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)' }}
              >
                CONTINUE →
              </button>

              {/* Try again */}
              <button
                onClick={handleRetry}
                style={{
                  flex: 1, minWidth: '140px',
                  background: 'transparent', color: 'var(--muted)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '16px 24px',
                  fontFamily: 'var(--font-body)', fontSize: '14px',
                  fontWeight: 600, letterSpacing: '2px',
                  textTransform: 'uppercase', cursor: 'pointer',
                  clipPath: 'polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.color = '#fff'
                  el.style.borderColor = 'rgba(255,255,255,0.3)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.color = 'var(--muted)'
                  el.style.borderColor = 'rgba(255,255,255,0.1)'
                }}
              >
                RETRY ↺
              </button>
            </div>

            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'rgba(255,255,255,0.15)', marginTop: '24px', letterSpacing: '1px',
              animation: 'pointsIn 0.5s 0.85s ease both',
              opacity: 0, animationFillMode: 'forwards',
            }}>
              next simulation loading — stay sharp, agent
            </p>
          </div>
        )}

      </div>
    </>
  )
}