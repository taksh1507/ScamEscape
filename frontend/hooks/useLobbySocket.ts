'use client'
/**
 * useLobbySocket — connects to the room lobby WebSocket.
 * Tracks live player list and broadcasts join/leave events.
 */
import { useEffect, useRef, useCallback, useState } from 'react'

export interface LobbyPlayer {
  player_id: string
  nickname: string
  is_leader: boolean
}

export type LobbyEvent =
  | { event: 'player_joined';  player_id: string; nickname: string; players: LobbyPlayer[] }
  | { event: 'player_left';    player_id: string; nickname: string; players: LobbyPlayer[] }
  | { event: 'game_starting';  room_code: string; difficulty: string; started_by: string }
  | { event: 'chat';           player_id: string; nickname: string; text: string }
  | { event: 'pong' }
  | { event: 'error';          message: string }

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000'

export function useLobbySocket(
  roomCode: string | null,
  playerId: string | null,
  onEvent?: (e: LobbyEvent) => void,
) {
  const wsRef    = useRef<WebSocket | null>(null)
  const onEvtRef = useRef(onEvent)
  onEvtRef.current = onEvent

  const [connected, setConnected]   = useState(false)
  const [players,   setPlayers]     = useState<LobbyPlayer[]>([])

  useEffect(() => {
    if (!roomCode || !playerId) return

    const url = `${WS_BASE}/rooms/ws/lobby/${roomCode}/${playerId}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen  = () => setConnected(true)
    ws.onclose = () => { setConnected(false); wsRef.current = null }
    ws.onerror = () => setConnected(false)

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as LobbyEvent
        // Keep local player list in sync
        if (data.event === 'player_joined' || data.event === 'player_left') {
          setPlayers(data.players)
        }
        onEvtRef.current?.(data)
      } catch { /* ignore malformed frames */ }
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

  const ping = useCallback(() => send({ type: 'ping' }), [send])

  return { connected, players, send, ping }
}
