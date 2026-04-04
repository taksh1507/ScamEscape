'use client'
import { useEffect, useRef, useCallback, useState } from 'react'

export type GameEvent =
  | { event: 'game_start';    room_code: string; total_rounds: number }
  | { event: 'start_round';   data: { type: string; round_number: number; duration: number; content: any; red_flags: string[] } }
  | { event: 'timer_tick';    round_number: number; remaining: number }
  | { event: 'round_result';  round_number: number; correct_action: string; red_flags: string[]; results: RoundResultEntry[] }
  | { event: 'game_over';     leaderboard: LeaderboardEntry[] }
  | { event: 'player_joined'; player_id: string; nickname: string }
  | { event: 'player_left';   player_id: string; nickname: string }
  | { event: 'action_received'; action: string }
  | { event: 'decision_result';  data: { selected_option: string; risk_level: string; grade: string; explanation: string; better_action: string } }
  | { event: 'call_update';    player_id: string; data: { phase: string; message: string; suggested_actions: any[] } }
  | { event: 'round_end';      round_number: number }
  | { event: 'error';         message: string }
  | { event: 'pong' }

export interface RoundResultEntry {
  player_id: string
  nickname: string
  action: string
  points_awarded: number
  grade_letter: string
  grade_label: string
  grade_color: string
  total_score: number
}

export interface LeaderboardEntry {
  rank: number
  player_id: string
  nickname: string
  total_score: number
}

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000'

export function useGameSocket(
  roomCode: string | null,
  playerId: string | null,
  onMessage: (event: GameEvent) => void,
) {
  const wsRef    = useRef<WebSocket | null>(null)
  const onMsgRef = useRef(onMessage)
  onMsgRef.current = onMessage

  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!roomCode || !playerId) return

    const url = `${WS_BASE}/game/ws/${roomCode}/${playerId}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen  = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as GameEvent
        onMsgRef.current(data)
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

  const submitAction = useCallback((action: string) => {
    send({ type: 'submit_action', action })
  }, [send])

  const sendUserAction = useCallback((action: string) => {
    send({ type: 'user_action', action })
  }, [send])

  const startGame = useCallback((difficulty: string = 'easy') => {
    send({ type: 'start_game', difficulty })
  }, [send])

  return { connected, send, submitAction, sendUserAction, startGame }
}
