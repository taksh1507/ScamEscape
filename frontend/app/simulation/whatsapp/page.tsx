'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import WhatsAppSimulation from '@/components/sections/WhatsAppSimulation'
import { useToast } from '@/hooks/useToast'

function WhatsAppPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast, show: showToast } = useToast()

  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get room code and player ID from URL parameters
    const room = searchParams.get('room')
    const userId = searchParams.get('player')

    if (!room || !userId) {
      showToast('ERROR', 'Missing room code or player ID')
      setTimeout(() => router.push('/rooms'), 2000)
      return
    }

    setRoomCode(room)
    setPlayerId(userId)
    setLoading(false)
  }, [searchParams, router, showToast])

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center text-white">
          <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-xl font-semibold">Loading Round 2...</p>
        </div>
      </div>
    )
  }

  if (!roomCode || !playerId) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Game Parameters</h1>
          <p className="text-gray-600 mb-6">Missing room code or player ID.</p>
          <button
            onClick={() => router.push('/rooms')}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            Back to Rooms
          </button>
        </div>
      </div>
    )
  }

  return <WhatsAppSimulation roomCode={roomCode} playerId={playerId} />
}

export default function WhatsAppPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center text-white">
          <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-xl font-semibold">Loading...</p>
        </div>
      </div>
    }>
      <WhatsAppPageContent />
    </Suspense>
  )
}
