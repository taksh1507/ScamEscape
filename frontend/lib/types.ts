export type RoomStatus = 'open' | 'playing' | 'full'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type PlayerType = 'filled' | 'empty' | 'you'

export interface Player {
  initials: string
  type: PlayerType
}

export interface Room {
  id: number
  name: string
  status: RoomStatus
  difficulty: Difficulty
  players: Player[]
  count: number
}

export interface ToastState {
  title: string
  message: string
  visible: boolean
}

export interface StatItem {
  id: string
  target: number
  label: string
}

export interface FeatureItem {
  icon: string
  title: string
  desc: string
}

export interface NavLink {
  label: string
  href: string
}
