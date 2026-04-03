'use client'

interface NameInputProps {
  value: string
  onChange: (val: string) => void
}

export default function NameInput({ value, onChange }: NameInputProps) {
  return (
    <div style={{ maxWidth: '560px', margin: '0 auto 64px', textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%' }}>
        <span style={{
          position: 'absolute', left: '16px',
          fontFamily: 'var(--font-mono)', fontSize: '14px',
          color: 'var(--red)', pointerEvents: 'none', zIndex: 1,
        }}>{'> '}</span>
        <input
          type="text"
          maxLength={20}
          placeholder="Enter your agent codename..."
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === ' ') e.preventDefault() }}
          style={{
            width: '100%', background: 'var(--card)',
            border: '1px solid var(--border)', color: '#fff',
            fontFamily: 'var(--font-mono)', fontSize: '15px',
            padding: '16px 16px 16px 44px', letterSpacing: '1px',
            outline: 'none',
            clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--red)'
            e.currentTarget.style.boxShadow = '0 0 20px rgba(255,23,68,0.2)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', marginTop: '10px', letterSpacing: '1px' }}>
        {/* max 20 characters &nbsp;|&nbsp; no spaces allowed */}
      </p>
    </div>
  )
}