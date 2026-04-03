'use client'
import { useEffect } from 'react'
import type { Difficulty } from '@/lib/types'

interface ModalProps {
  isOpen: boolean
  agentName: string
  difficulty: Difficulty
  onClose: () => void
  onConfirm: () => void
}

export default function Modal({ isOpen, agentName, difficulty, onClose, onConfirm }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const diffLabel =
    difficulty === 'easy'   ? 'EASY — CALL SIMULATION' :
    difficulty === 'medium' ? 'MEDIUM — SOCIAL ENGINEERING' :
                              'HARD — ADVANCED PERSISTENT THREAT'

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        background: 'var(--dark3)',
        border: '1px solid rgba(255,23,68,0.3)',
        maxWidth: '480px', width: '90%',
        padding: '48px 40px',
        position: 'relative',
        clipPath: 'polygon(0 0,calc(100% - 24px) 0,100% 24px,100% 100%,24px 100%,0 calc(100% - 24px))',
        boxShadow: '0 0 60px rgba(255,23,68,0.2)',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'none', border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--muted)', width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '18px',
          }}
        >
          ✕
        </button>

        <h2 style={{
          fontFamily: 'var(--font-head)', fontSize: '36px',
          letterSpacing: '3px', color: '#fff', marginBottom: '8px',
        }}>
          READY TO<br />
          <span style={{ color: 'var(--red)' }}>SIMULATE?</span>
        </h2>

        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '12px',
          color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px',
        }}>
          // AGENT: {agentName.toUpperCase()}
        </p>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '12px',
          color: 'var(--red)', letterSpacing: '1px', marginBottom: '28px',
        }}>
          // SCENARIO: {diffLabel}
        </p>

        <div style={{
          background: 'rgba(255,23,68,0.06)',
          border: '1px solid rgba(255,23,68,0.15)',
          padding: '20px', marginBottom: '32px',
          fontSize: '14px', color: 'var(--text)', lineHeight: 1.7,
        }}>
          You will be placed into a{' '}
          <strong style={{ color: 'var(--red)' }}>live scam simulation</strong>.
          Make decisions carefully — every choice is tracked and scored.
          Your behavioral profile will be analyzed after each session.
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, background: 'var(--red)', color: '#fff', border: 'none',
              padding: '14px', fontFamily: 'var(--font-body)',
              fontSize: '14px', fontWeight: 700, letterSpacing: '2px',
              textTransform: 'uppercase', cursor: 'pointer',
              clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
              transition: 'background 0.3s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--pink)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)' }}
          >
            LAUNCH ▶
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, background: 'transparent', color: 'var(--text)',
              border: '1px solid rgba(255,23,68,0.4)',
              padding: '14px', fontFamily: 'var(--font-body)',
              fontSize: '14px', fontWeight: 600, letterSpacing: '2px',
              textTransform: 'uppercase', cursor: 'pointer',
              clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  )
}