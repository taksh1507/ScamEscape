'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { createRoom, joinRoom, leaveRoom } from '@/lib/api'
import { useLobbySocket } from './useLobbySocket'

export type RoomState = 'idle' | 'loading' | 'lobby' | 'launching' | 'error'

export function useRoom(onGameStarting?: (difficulty: string) => void) {
  const [state,    setState]    = useState<RoomState>('idle')
  const [error,    setError]    = useState<string | null>(null)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [isLeader, setIsLeader] = useState(false)

  // When launching we must NOT call leaveRoom on unmount — the player
  // needs to stay alive in the backend store so the game WS can find them.
  const launchingRef = useRef(false)

  const { connected, players, send } = useLobbySocket(
    roomCode,
    playerId,
    (evt) => {
      if (evt.event === 'game_starting') {
        launchingRef.current = true   // suppress cleanup leaveRoom
        setState('launching')
        onGameStarting?.(evt.difficulty)
      }
    },
  )

  const create = useCallback(async (nickname: string) => {
    setState('loading')
    setError(null)
    try {
      const res = await createRoom(nickname)
      setRoomCode(res.room_code)
      setPlayerId(res.player_id)
      setIsLeader(res.is_leader)
      setState('lobby')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create room')
      setState('error')
    }
  }, [])

  const join = useCallback(async (nickname: string, code: string) => {
    setState('loading')
    setError(null)
    try {
      const res = await joinRoom(nickname, code)
      setRoomCode(res.room_code)
      setPlayerId(res.player_id)
      setIsLeader(res.is_leader)
      setState('lobby')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join room')
      setState('error')
    }
  }, [])

  const leave = useCallback(async () => {
    if (playerId) await leaveRoom(playerId)
    setRoomCode(null)
    setPlayerId(null)
    setIsLeader(false)
    launchingRef.current = false
    setState('idle')
  }, [playerId])

  const startGame = useCallback((difficulty: string) => {
    send({ type: 'start_game', difficulty })
  }, [send])

  // Only call leaveRoom on unmount if we are NOT launching into the game.
  // If launching, the player record must stay alive for the game WS.
  useEffect(() => {
    return () => {
      if (!launchingRef.current && playerId) {
        leaveRoom(playerId).catch(() => {})
      }
    }
  }, [playerId])

  return {
    state, error, roomCode, playerId, isLeader,
    connected, players,
    send, create, join, leave, startGame,
  }
}
