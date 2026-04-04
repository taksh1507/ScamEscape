'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import CallSimulation from '@/components/sections/CallSimulation'
import CursorEffect from '@/components/ui/CursorEffect'

function CallSimulationWrapper() {
  const params   = useSearchParams()
  const roomCode = params.get('room')
  const playerId = params.get('player')

  return <CallSimulation roomCode={roomCode} playerId={playerId} />
}

export default function CallSimulationPage() {
  return (
    <>
      <CursorEffect />
      <Suspense fallback={null}>
        <CallSimulationWrapper />
      </Suspense>
    </>
  )
}
