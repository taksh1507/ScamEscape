'use client'

interface RoundSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (round: 'call' | 'whatsapp') => void
  isLoading?: boolean
}

export default function RoundSelector({ isOpen, onClose, onSelect, isLoading = false }: RoundSelectorProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose()
      }}
    >
      <div
        style={{
          background: 'var(--card)',
          border: '2px solid var(--red)',
          borderRadius: '8px',
          padding: '48px 40px',
          maxWidth: '500px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-head)',
            fontSize: '28px',
            color: '#fff',
            marginBottom: '12px',
            letterSpacing: '2px',
          }}
        >
          SELECT <span style={{ color: 'var(--red)' }}>GAME TYPE</span>
        </h2>
        <p style={{ color: 'var(--muted)', marginBottom: '32px', fontSize: '14px' }}>
          Choose which scam simulation to practice with
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* Round 1: Call Simulation */}
          <button
            onClick={() => onSelect('call')}
            disabled={isLoading}
            style={{
              background: 'rgba(0,229,255,0.1)',
              border: '2px solid rgba(0,229,255,0.3)',
              borderRadius: '4px',
              padding: '20px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              opacity: isLoading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,229,255,0.2)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,229,255,0.5)'
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,229,255,0.1)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,229,255,0.3)'
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>☎️</div>
            <h3 style={{ color: '#00e5ff', fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
              ROUND 1
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '12px' }}>Call Simulation</p>
          </button>

          {/* Round 2: WhatsApp Simulation */}
          <button
            onClick={() => onSelect('whatsapp')}
            disabled={isLoading}
            style={{
              background: 'rgba(255,183,0,0.1)',
              border: '2px solid rgba(255,183,0,0.3)',
              borderRadius: '4px',
              padding: '20px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              opacity: isLoading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,183,0,0.2)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,183,0,0.5)'
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,183,0,0.1)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,183,0,0.3)'
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
            <h3 style={{ color: '#ffb700', fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
              ROUND 2
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '12px' }}>WhatsApp Scam</p>
          </button>
        </div>

        <button
          onClick={onClose}
          disabled={isLoading}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.6)',
            padding: '8px 20px',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '1px',
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          {isLoading ? 'LOADING...' : 'CANCEL'}
        </button>
      </div>
    </div>
  )
}
