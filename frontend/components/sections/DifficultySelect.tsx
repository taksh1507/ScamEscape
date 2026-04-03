'use client'
import { DIFFICULTY_OPTIONS } from '@/lib/constants'
import type { Difficulty } from '@/lib/types'

interface DifficultySelectProps {
  selected: Difficulty
  onChange: (d: Difficulty) => void
}

const ACTIVE_COLORS: Record<Difficulty, { border: string; color: string; shadow: string }> = {
  easy:   { border: '#00e676', color: '#00e676', shadow: '0 0 20px rgba(0,230,118,0.25)' },
  medium: { border: '#ffb700', color: '#ffb700', shadow: '0 0 20px rgba(255,183,0,0.25)' },
  hard:   { border: 'var(--red)', color: 'var(--red)', shadow: '0 0 20px rgba(255,23,68,0.3)' },
}

export default function DifficultySelect({ selected, onChange }: DifficultySelectProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '64px', flexWrap: 'wrap' }}>
      {DIFFICULTY_OPTIONS.map(opt => {
        const active = selected === opt.value
        const ac = ACTIVE_COLORS[opt.value]
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              position: 'relative', background: 'var(--card)',
              border: `1px solid ${active ? ac.border : 'rgba(255,255,255,0.08)'}`,
              color: active ? ac.color : 'var(--muted)',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700,
              letterSpacing: '2px', textTransform: 'uppercase',
              padding: '14px 28px', cursor: 'pointer',
              transition: 'all 0.3s',
              clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
              boxShadow: active ? ac.shadow : 'none',
            }}
          >
            <span style={{ display: 'block' }}>{opt.label}</span>
            <span style={{ display: 'block', fontSize: '9px', letterSpacing: '2px', marginTop: '4px', opacity: 0.7 }}>{opt.sub}</span>
          </button>
        )
      })}
    </div>
  )
}