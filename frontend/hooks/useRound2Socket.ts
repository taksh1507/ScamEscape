'use client'
import { useEffect, useRef, useCallback, useState } from 'react'

// ─── Event Types ────────────────────────────────────────────────────────────

export type Round2Event =
  | { event: 'round2_start'; scammer: { name: string; type: string; has_verified_badge: boolean; profile_picture: string }; difficulty: string; message_count: number }
  | { event: 'identified'; player_id: string; status: string }
  | { event: 'game_started'; status: string }
  | { event: 'new_message'; message: { id: string; sender: string; content: string; type: string; timestamp: number; has_pressure: boolean; typing_delay_ms?: number; response_options?: Array<{ label: string; action: string; risk: string }> } }
  | { event: 'pressure_message'; player_id: string; message: string; countdown_text: string; pressure_level: string }
  | { event: 'message_processed'; status: string; behavior_profile?: string; followup_available?: boolean; ai_response?: string }
  | { event: 'action_processed'; status: string; action: string; impact: any; scam_progress: number; game_result?: any; result?: string; response_message?: string; response_options?: Array<{ label: string; action: string; risk: string }> }
  | { event: 'power_up_used'; status: string; message: string; effectiveness: number }
  | { event: 'error'; message: string }

export interface ScammerProfile {
  name: string
  type: string
  has_verified_badge: boolean
  profile_picture: string
}

export interface WhatsAppMessage {
  id: string
  sender: string
  content: string
  type: string
  timestamp: number
  has_pressure: boolean
  is_own: boolean
  response_options?: Array<{ label: string; action: string; risk: string }>  // 🔥 NEW: Action buttons for messages
}

export interface WarningInfo {
  total_warnings_detected: number
  total_warnings_ignored: number
  critical_violations: number
  key_missed_warnings: string[]
}

export interface BehaviorInfo {
  profile: string
  total_messages: number
  avg_response_time_seconds: number
  questions_asked: number
  panic_indicators: number
}

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000'

export function useRound2Socket(
  roomCode: string | null,
  playerId: string | null,
  onMessage: (event: Round2Event) => void,
) {
  const wsRef = useRef<WebSocket | null>(null)
  const onMsgRef = useRef(onMessage)
  onMsgRef.current = onMessage

  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!roomCode || !playerId) return

    const url = `${WS_BASE}/round2/play/${roomCode}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      // Identify player
      ws.send(JSON.stringify({ event: 'identify', player_id: playerId }))
    }
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as Round2Event
        onMsgRef.current(data)
      } catch (err) {
        console.error('Failed to parse message:', err)
      }
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [roomCode, playerId])

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const startGame = useCallback(() => {
    send({ event: 'start_game' })
  }, [send])

  const sendMessage = useCallback((message: string) => {
    send({ event: 'player_message', message })
  }, [send])

  const takeAction = useCallback((action: string, context?: any) => {
    send({ event: 'player_action', action, context })
  }, [send])

  const usePowerUp = useCallback((powerUp: string) => {
    send({ event: 'use_power_up', power_up: powerUp })
  }, [send])

  const endGame = useCallback(() => {
    send({ event: 'end_game' })
  }, [send])

  return {
    connected,
    send,
    startGame,
    sendMessage,
    takeAction,
    usePowerUp,
    endGame,
  }
}

// ─── Helper Hooks ───────────────────────────────────────────────────────────

export function usePlayerAnalytics(roomCode: string | null, playerId: string | null) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchAnalytics = useCallback(async () => {
    if (!roomCode || !playerId) return
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/round2/player-analytics/${roomCode}/${playerId}`
      )
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [roomCode, playerId])

  useEffect(() => {
    if (roomCode && playerId) {
      fetchAnalytics()
      const interval = setInterval(fetchAnalytics, 5000) // Update every 5 seconds
      return () => clearInterval(interval)
    }
  }, [roomCode, playerId, fetchAnalytics])

  return { analytics, loading, refetch: fetchAnalytics }
}

export function useAvailablePowerUps(roomCode: string | null, playerId: string | null) {
  const [powerUps, setPowerUps] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchPowerUps = useCallback(async () => {
    if (!roomCode || !playerId) return
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/round2/available-power-ups/${roomCode}/${playerId}`
      )
      if (res.ok) {
        const data = await res.json()
        setPowerUps(data)
      }
    } catch (err) {
      console.error('Failed to fetch power-ups:', err)
    } finally {
      setLoading(false)
    }
  }, [roomCode, playerId])

  useEffect(() => {
    fetchPowerUps()
  }, [roomCode, playerId, fetchPowerUps])

  return { powerUps, loading, refetch: fetchPowerUps }
}
