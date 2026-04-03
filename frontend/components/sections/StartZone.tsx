'use client'
import { ROOMS } from '@/lib/rooms'
import type { Difficulty } from '@/lib/types'

interface StartZoneProps {
  agentName: string
  selectedRoom: number
  selectedDiff: Difficulty
  onStart: () => void
}

export default function StartZone({ agentName, selectedRoom, selectedDiff, onStart }: StartZoneProps) {
  const isReady = agentName.trim().length > 0 && selectedRoom >= 0
  const room = ROOMS.find(r => r.id === selectedRoom)

  const statusText = isReady
    ? `// ${agentName.toUpperCase()} · ROOM ${room?.name} · ${selectedDiff.toUpperCase()} — READY TO LAUNCH`
    : agentName.trim().length === 0 && selectedRoom < 0
      ? '// set your name and select a room to begin'
      : agentName.trim().length === 0
        ? '// enter your agent name to proceed'
        : '// select a room to begin'

  return (
    <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto', paddingBottom: '80px' }}>
      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(32px,5vw,56px)', letterSpacing: '4px', color: '#fff', marginBottom: '16px', lineHeight: 1 }}>
        READY TO<br /><span style={{ color: 'var(--red)' }}>SIMULATE?</span>
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '40px', letterSpacing: '0.5px', lineHeight: 1.7 }}>
        Your AI-powered fraud detection training session is about to begin. Stay sharp — every decision is monitored and scored in real time.
      </p>

      {/* Pulsing button wrapper */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div style={{
          position: 'absolute', inset: '-4px',
          border: '2px solid var(--red)',
          clipPath: 'polygon(16px 0%,100% 0%,calc(100% - 16px) 100%,0% 100%)',
          animation: 'startPulse 2s ease-in-out infinite',
          opacity: 0.4, pointerEvents: 'none',
        }} />
        <button
          onClick={onStart}
          style={{
            position: 'relative', display: 'inline-flex',
            alignItems: 'center', gap: '14px',
            background: 'transparent', border: '2px solid var(--red)',
            color: '#fff', fontFamily: 'var(--font-head)',
            fontSize: '22px', letterSpacing: '5px',
            padding: '20px 56px', cursor: 'pointer',
            transition: 'all 0.4s', overflow: 'hidden',
            clipPath: 'polygon(16px 0%,100% 0%,calc(100% - 16px) 100%,0% 100%)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.boxShadow = '0 0 60px rgba(255,23,68,0.5)'
            el.style.transform = 'translateY(-3px)'
            el.style.background = 'rgba(255,23,68,0.1)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.boxShadow = 'none'
            el.style.transform = 'translateY(0)'
            el.style.background = 'transparent'
          }}
        >
          <span>START SIMULATION</span>
          <span>▶</span>
        </button>
      </div>

      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: '11px',
        color: isReady ? 'var(--cyan)' : 'var(--muted)',
        marginTop: '20px', letterSpacing: '1px',
        transition: 'color 0.3s',
      }}>
        {statusText}
      </p>
    </div>
  )
}