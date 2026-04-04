/**
 * api.ts — thin wrapper around the FraudGuard Arena REST API
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export interface CreateRoomResponse {
  room_code: string
  player_id: string
  is_leader: boolean
}

export interface JoinRoomResponse {
  room_code: string
  player_id: string
  is_leader: boolean
}

export interface RoomPlayer {
  player_id: string
  nickname: string
  is_leader: boolean
}

export interface RoomListItem {
  room_code: string
  status: 'waiting' | 'playing' | 'finished'
  player_count: number
  max_players: number
  players: RoomPlayer[]
}

export async function createRoom(nickname: string): Promise<CreateRoomResponse> {
  const res = await fetch(`${BASE}/rooms/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create room' }))
    throw new Error(err.detail ?? 'Failed to create room')
  }
  return res.json()
}

export async function joinRoom(nickname: string, room_code: string): Promise<JoinRoomResponse> {
  const res = await fetch(`${BASE}/rooms/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, room_code }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail ?? 'Failed to join room')
  }
  return res.json()
}

export async function leaveRoom(player_id: string): Promise<void> {
  await fetch(`${BASE}/rooms/leave/${player_id}`, { method: 'DELETE' })
}

export async function listRooms(): Promise<RoomListItem[]> {
  const res = await fetch(`${BASE}/rooms/list`)
  if (!res.ok) return []
  return res.json()
}

export async function getRoom(room_code: string): Promise<RoomListItem | null> {
  const res = await fetch(`${BASE}/rooms/${room_code}`)
  if (!res.ok) return null
  return res.json()
}
