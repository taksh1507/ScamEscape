'use client'
import { ROOMS } from '@/lib/rooms'
import RoomCard from './RoomCard'

interface RoomGridProps {
  selectedRoom: number
  onSelect: (id: number) => void
  onRoomFull: () => void
}

export default function RoomGrid({ selectedRoom, onSelect, onRoomFull }: RoomGridProps) {
  const handleClick = (id: number) => {
    const room = ROOMS.find(r => r.id === id)
    if (room?.status === 'full') { onRoomFull(); return }
    onSelect(id)
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px', maxWidth: '1100px', margin: '0 auto 60px',
    }}>
      {ROOMS.map(room => (
        <RoomCard
          key={room.id}
          room={room}
          isSelected={selectedRoom === room.id}
          onClick={() => handleClick(room.id)}
        />
      ))}
    </div>
  )
}