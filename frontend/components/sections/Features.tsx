'use client'
import { FEATURES } from '@/lib/constants'
import { useReveal } from '@/hooks/useReveal'

export default function Features() {
  const { ref, visible } = useReveal()

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'visible' : ''}`}
      style={{
        position: 'relative', zIndex: 2, padding: '40px',
        borderTop: '1px solid rgba(255,23,68,0.08)',
        borderBottom: '1px solid rgba(255,23,68,0.08)',
        background: 'rgba(255,23,68,0.02)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'stretch', justifyContent: 'center',
        maxWidth: '1100px', margin: '0 auto', flexWrap: 'wrap',
      }}>
        {FEATURES.map((feat, i) => (
          <div
            key={feat.title}
            style={{
              flex: 1, minWidth: '200px', padding: '32px 28px',
              display: 'flex', alignItems: 'flex-start', gap: '16px',
              borderRight: i < FEATURES.length - 1 ? '1px solid rgba(255,23,68,0.1)' : 'none',
            }}
          >
            <div style={{
              width: '44px', height: '44px', flexShrink: 0,
              background: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px',
              clipPath: 'polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%)',
            }}>
              {feat.icon}
            </div>
            <div>
              <h4 style={{
                fontFamily: 'var(--font-body)', fontSize: '13px',
                fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
                color: '#fff', marginBottom: '6px',
              }}>{feat.title}</h4>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}