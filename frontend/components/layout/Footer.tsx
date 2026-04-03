export default function Footer() {
  return (
    <footer style={{
      position: 'relative', zIndex: 2,
      padding: '32px 40px',
      borderTop: '1px solid rgba(255,23,68,0.1)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
    }}>
      <div style={{ fontFamily: 'var(--font-head)', fontSize: '18px', letterSpacing: '3px', color: 'rgba(255,255,255,0.4)' }}>
        Scam<span style={{ color: 'rgba(255,23,68,0.5)' }}>Escape</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px' }}>
         Scam Escape AI — INTERACTIVE SCAM TRAINING PLATFORM — 2024
      </div>
      <div style={{ display: 'flex', gap: '24px' }}>
        {['Privacy', 'Terms'].map(link => (
          <a
            key={link}
            href="#"
            style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'rgba(255,255,255,0.25)', textDecoration: 'none',
              letterSpacing: '1px', transition: 'color 0.3s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
          >
            {link}
          </a>
        ))}
      </div>
    </footer>
  )
}