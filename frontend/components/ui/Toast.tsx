'use client'

interface ToastProps {
  title: string
  message: string
  visible: boolean
}

export default function Toast({ title, message, visible }: ToastProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        background: 'var(--card2)',
        border: '1px solid rgba(255,23,68,0.4)',
        padding: '16px 24px',
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        color: '#fff',
        zIndex: 200,
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        transition: 'transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
        maxWidth: '300px',
        clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
      }}
    >
      <div style={{ color: 'var(--red)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
        {/* {title} */}
      </div>
      <div>{message}</div>
    </div>
  )
}