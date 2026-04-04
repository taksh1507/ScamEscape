'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CursorEffect from '@/components/ui/CursorEffect'
import { Phone, MessageSquare, MailWarning, Zap, Lock, ShieldAlert } from 'lucide-react'

const T = {
  mid: '#7070a0',
  green: '#00e676',
  red: '#ff1744',
  cyan: '#00e5ff',
  dim: '#404060',
  border: 'rgba(255,255,255,0.1)',
}

const MODES = [
  { id: 'call', icon: Phone, label: 'Voice Intel', desc: 'Real-time Vishing', detail: 'Detect high-pressure tactics in live neural-synthesized scam calls.', color: T.red },
  { id: 'chat', icon: MessageSquare, label: 'Text Protocol', desc: 'Smishing Fraud', detail: 'Inspect deceptive texts, WhatsApp forwarding schemes, and shortened URLs.', color: T.cyan },
  { id: 'email', icon: MailWarning, label: 'Email Defense', desc: 'Phishing Payload', detail: 'Scrutinize email headers, fake corporate domains, and malicious attachments.', color: T.green }
]

const DIFFICULTIES = [
  { id: 'easy', label: 'EASY', xp: '1.0x XP', color: T.green },
  { id: 'medium', label: 'NORMAL', xp: '1.5x XP', color: T.cyan },
  { id: 'hard', label: 'HARDCORE', xp: '2.0x XP', color: T.red }
]

export default function PlayPage() {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState('call')
  const [difficulty, setDifficulty] = useState('medium')

  const handleStartMission = () => {
    router.push(`/simulation?mode=${selectedMode}&diff=${difficulty}`)
  }

  const handleEnter = () => {
    // Navigation for Play page
  }

  const activeModeData = MODES.find(m => m.id === selectedMode)
  const activeColor = activeModeData?.color || T.cyan
  const activeDiffData = DIFFICULTIES.find(d => d.id === difficulty)

  return (
    <>
      <CursorEffect />
      <Navbar onEnter={handleEnter} />

      <main style={{ padding: '120px 24px 60px', maxWidth: 900, margin: '0 auto', minHeight: '80vh', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40 }}>
          <div style={{ padding: 13, background: `${T.red}12`, borderRadius: 10 }}>
            <Zap size={26} color={T.red} />
          </div>
          <div>
            <h2 className="syne" style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: '2px', margin: 0, textTransform: 'uppercase' }}>
              Game <span style={{ color: T.red }}>Hub</span>
            </h2>
            <p style={{ color: T.mid, fontSize: 15, margin: '4px 0 0 0', fontFamily: 'var(--font-body)' }}>
              Select your combat scenario and threat level constraints
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28 }}>
          
          {/* LEFT: Setup */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Mode Selection */}
            <div>
              <div className="mono" style={{ fontSize: 11, color: T.dim, letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                1. SELECT THREAT VECTOR
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MODES.map((mode) => {
                  const isActive = selectedMode === mode.id
                  const Icon = mode.icon
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        width: '100%', padding: '16px',
                        background: isActive ? `${mode.color}08` : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isActive ? mode.color : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: 10, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: isActive ? `0 0 15px ${mode.color}15` : 'none',
                      }}
                      onMouseEnter={e => { if(!isActive) e.currentTarget.style.borderColor = mode.color }}
                      onMouseLeave={e => { if(!isActive) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                    >
                      <div style={{ padding: 10, background: isActive ? `${mode.color}15` : 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
                        <Icon size={20} color={isActive ? mode.color : T.mid} />
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-body)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                          {mode.label}
                        </div>
                        <div style={{ fontSize: 13, color: T.mid, marginTop: 2, fontFamily: 'var(--font-body)' }}>{mode.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Difficulty Selection */}
            <div>
              <div className="mono" style={{ fontSize: 11, color: T.dim, letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                2. ASSESSMENT LEVEL
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {DIFFICULTIES.map((diff) => {
                  const isActive = difficulty === diff.id
                  return (
                     <button
                        key={diff.id}
                        onClick={() => setDifficulty(diff.id)}
                        style={{
                           padding: '12px 6px',
                           background: isActive ? `${diff.color}10` : 'rgba(255,255,255,0.02)',
                           border: `1px solid ${isActive ? diff.color : 'rgba(255,255,255,0.08)'}`,
                           borderRadius: 8, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { if(!isActive) e.currentTarget.style.borderColor = diff.color }}
                        onMouseLeave={e => { if(!isActive) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                     >
                        <div style={{ fontSize: 13, fontWeight: 800, color: isActive ? diff.color : T.mid, fontFamily: 'var(--font-body)', letterSpacing: '1px' }}>{diff.label}</div>
                        <div className="mono" style={{ fontSize: 10, color: T.dim, marginTop: 4, fontFamily: 'var(--font-mono)' }}>{diff.xp}</div>
                     </button>
                  )
                })}
              </div>
            </div>

          </div>

          {/* RIGHT: Deploy */}
          <div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${activeColor}30`, borderRadius: '12px', padding: 28, position: 'sticky', top: 100, minHeight: 360, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <div className="mono" style={{ fontSize: 11, color: T.dim, marginBottom: 6, fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>INTEL BRIEF</div>
                  <div className="syne" style={{ fontSize: 28, fontWeight: 800, color: activeColor, fontFamily: 'var(--font-head)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {activeModeData?.label}
                  </div>
                </div>
                {activeModeData && React.createElement(activeModeData.icon, { size: 32, color: activeColor, style: { opacity: 0.8 } })}
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 24, fontSize: 15, color: '#ccc', lineHeight: 1.6 }}>
                {activeModeData?.detail}
              </div>

              <div style={{ flex: 1 }}>
                <div className="mono" style={{ fontSize: 11, color: T.dim, marginBottom: 12, fontFamily: 'var(--font-mono)' }}>SIMULATION MODIFIERS</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, color: T.mid, fontSize: 13 }}>
                   <ShieldAlert size={14} color={activeDiffData?.color} /> Difficulty multiplier: <strong style={{ color: activeDiffData?.color }}>{activeDiffData?.xp}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, color: T.mid, fontSize: 13 }}>
                   <Lock size={14} color={activeColor} /> Secure environment enclave
                </div>
              </div>

              <button
                onClick={handleStartMission}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: activeColor, color: '#000', padding: '16px', fontFamily: 'var(--font-head)',
                  fontSize: '20px', fontWeight: 800, border: 'none', cursor: 'pointer',
                  clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)', transition: 'all 0.3s',
                  marginTop: 16
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                DEPLOY SIMULATION <Zap size={18} />
              </button>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </>
  )
}
