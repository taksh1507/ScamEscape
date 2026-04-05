'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ChatSimulation from '@/components/sections/ChatSimulation'
import CursorEffect from '@/components/ui/CursorEffect'

function ChatSimulationWrapper() {
  const params = useSearchParams()
  const roomCode = params.get('room')
  const playerId = params.get('player')

  return <ChatSimulation roomCode={roomCode} playerId={playerId} />
}

export default function ChatSimulationPage() {
  return (
    <>
      <CursorEffect />
      <Suspense fallback={null}>
        <ChatSimulationWrapper />
      </Suspense>
    </>
  )
}
