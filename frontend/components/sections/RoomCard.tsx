'use client'
import type { Room } from '@/lib/types'

const DIFF_COLORS = { easy: '#00e676', medium: '#ffb700', hard: '#ff1744' }
const STATUS_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  open:    { bg: 'rgba(0,229,255,0.1)',   border: 'rgba(0,229,255,0.3)',   color: '#00e5ff', label: 'OPEN' },
  playing: { bg: 'rgba(255,183,0,0.1)',   border: 'rgba(255,183,0,0.3)',   color: '#ffb700', label: 'IN PROGRESS' },
  full:    { bg: 'rgba(255,23,68,0.1)',   border: 'rgba(255,23,68,0.3)',   color: '#ff1744', label: 'FULL' },
}

interface RoomCardProps {
  room: Room
  isSelected: boolean
  onClick: () => void
}

export default function RoomCard({ room, isSelected, onClick }: RoomCardProps) {
  const st = STATUS_STYLES[room.status]

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--card)',
        border: `1px solid ${isSelected ? 'var(--red)' : 'var(--border)'}`,
        padding: '24px', position: 'relative', overflow: 'hidden',
        cursor: 'pointer', transition: 'border-color 0.3s, transform 0.3s, box-shadow 0.3s',
        clipPath: 'polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))',
        boxShadow: isSelected ? '0 0 30px rgba(255,23,68,0.25)' : 'none',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-4px)'
        el.style.boxShadow = '0 8px 32px rgba(255,23,68,0.15)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = isSelected ? '0 0 30px rgba(255,23,68,0.25)' : 'none'
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontFamily: 'var(--font-head)', fontSize: '20px', letterSpacing: '2px', color: '#fff' }}>
          ROOM {room.name}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '2px',
          padding: '4px 10px', borderRadius: '1px',
          background: st.bg, border: `1px solid ${st.border}`, color: st.color,
        }}>
          {st.label}
        </span>
      </div>

      {/* Player slots */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {room.players.map((player, i) => (
          <div
            key={i}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-body)',
              border: `2px solid ${player.type === 'you' ? 'var(--cyan)' : player.type === 'filled' ? 'var(--red)' : 'rgba(255,255,255,0.1)'}`,
              background: player.type === 'you' ? 'rgba(0,229,255,0.1)' : player.type === 'filled' ? 'rgba(255,23,68,0.15)' : 'rgba(255,255,255,0.03)',
              color: player.type === 'you' ? 'var(--cyan)' : player.type === 'filled' ? 'var(--red)' : 'rgba(255,255,255,0.2)',
            }}
          >
            {player.initials}
          </div>
        ))}
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: DIFF_COLORS[room.difficulty] }} />
          {room.difficulty.toUpperCase()}
        </span>
        <span>{room.count}/6 AGENTS</span>
      </div>
    </div>
  )
}