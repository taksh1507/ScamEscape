'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import LeaderboardPage from '@/components/sections/Leaderboard'


function LeaderboardContent() {
  const searchParams = useSearchParams()
  const roomCode = searchParams.get('room')
  const playerId = searchParams.get('player')
  const isRound2 = searchParams.get('round2') === 'true'

  return (
    <LeaderboardPage 
      roomCode={roomCode}
      playerId={playerId}
      isRound2Game={isRound2}
    />
  )
}

export default function Page() {
  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      zIndex: 999, 
      background: 'var(--dark)',
      overflowY: 'auto'
    }}>
      <Suspense fallback={<div style={{ color: 'var(--text)', textAlign: 'center', paddingTop: '100px' }}>Loading...</div>}>
        <LeaderboardContent />
      </Suspense>
    </div>
  )
}