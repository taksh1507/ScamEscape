import { TICKER_ITEMS } from '@/lib/constants'

export default function TickerStrip() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS]

  return (
    <div style={{
      position: 'relative', zIndex: 3,
      marginTop: '72px',
      padding: '12px 0',
      background: 'rgba(255,23,68,0.04)',
      borderTop: '1px solid rgba(255,23,68,0.12)',
      borderBottom: '1px solid rgba(255,23,68,0.12)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', gap: '40px', whiteSpace: 'nowrap',
        animation: 'scrollTicker 20s linear infinite',
      }}>
        {doubled.map((item, i) => (
          <span
            key={i}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '12px',
              color: 'rgba(255,23,68,0.6)', letterSpacing: '2px', flexShrink: 0,
            }}
          >
            {item}
            <span style={{ color: 'rgba(255,23,68,0.2)', margin: '0 8px' }}></span>
          </span>
        ))}
      </div>
    </div>
  )
}