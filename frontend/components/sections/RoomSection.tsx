'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useReveal } from '@/hooks/useReveal'
import { useToast } from '@/hooks/useToast'
import { useRoom } from '@/hooks/useRoom'
import { listRooms, RoomListItem } from '@/lib/api'
import type { Difficulty } from '@/lib/types'
import NameInput from './NameInput'
import DifficultySelect from './DifficultySelect'
import Modal from '@/components/ui/Modal'
import Toast from '@/components/ui/Toast'

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ tag, title, titleRed, desc }: {
  tag: string; title: string; titleRed: string; desc: string
}) {
  const { ref, visible } = useReveal()
  return (
    <div ref={ref} className={`reveal ${visible ? 'visible' : ''}`}
      style={{ textAlign: 'center', marginBottom: '56px' }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '11px',
        color: 'var(--red)', letterSpacing: '3px',
        textTransform: 'uppercase', display: 'block', marginBottom: '16px',
      }}>{tag}</span>
      <h2 style={{
        fontFamily: 'var(--font-head)',
        fontSize: 'clamp(36px,5vw,64px)',
        color: '#fff', letterSpacing: '3px', lineHeight: 1,
      }}>
        {title} <span style={{ color: 'var(--red)' }}>{titleRed}</span>
      </h2>
      <p style={{
        color: 'var(--muted)', fontSize: '15px',
        maxWidth: '480px', margin: '16px auto 0', lineHeight: 1.7,
      }}>{desc}</p>
    </div>
  )
}

// ─── Live room card ───────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  waiting: { bg: 'rgba(0,229,255,0.1)', border: 'rgba(0,229,255,0.3)', color: '#00e5ff', label: 'OPEN' },
  playing: { bg: 'rgba(255,183,0,0.1)', border: 'rgba(255,183,0,0.3)', color: '#ffb700', label: 'IN PROGRESS' },
  finished: { bg: 'rgba(255,23,68,0.1)', border: 'rgba(255,23,68,0.3)', color: '#ff1744', label: 'FINISHED' },
}

function LiveRoomCard({ room, isSelected, myPlayerId, onClick }: {
  room: RoomListItem; isSelected: boolean; myPlayerId: string | null; onClick: () => void
}) {
  const st = STATUS_STYLES[room.status] ?? STATUS_STYLES.waiting
  const slots = Array.from({ length: room.max_players })

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--card)',
        border: `1px solid ${isSelected ? 'var(--red)' : 'var(--border)'}`,
        padding: '24px', cursor: 'pointer',
        transition: 'border-color 0.3s, transform 0.3s, box-shadow 0.3s',
        clipPath: 'polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))',
        boxShadow: isSelected ? '0 0 30px rgba(255,23,68,0.25)' : 'none',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-4px)'
        el.style.boxShadow = '0 8px 32px rgba(255,23,68,0.15)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = isSelected ? '0 0 30px rgba(255,23,68,0.25)' : 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontFamily: 'var(--font-head)', fontSize: '18px', letterSpacing: '2px', color: '#fff' }}>
          ROOM <span style={{ color: 'var(--red)' }}>{room.room_code}</span>
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '2px', padding: '4px 10px',
          background: st.bg, border: `1px solid ${st.border}`, color: st.color,
        }}>{st.label}</span>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {slots.map((_, i) => {
          const p = room.players[i]
          const isMe = p?.player_id === myPlayerId
          return (
            <div key={i} style={{
              width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: 700, fontFamily: 'var(--font-body)',
              border: `2px solid ${isMe ? 'var(--cyan)' : p ? 'var(--red)' : 'rgba(255,255,255,0.1)'}`,
              background: isMe ? 'rgba(0,229,255,0.1)' : p ? 'rgba(255,23,68,0.15)' : 'rgba(255,255,255,0.03)',
              color: isMe ? 'var(--cyan)' : p ? 'var(--red)' : 'rgba(255,255,255,0.2)',
            }}>
              {p ? (isMe ? 'YOU' : p.nickname.slice(0, 2).toUpperCase()) : ''}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)' }}>
        <span>{room.player_count}/{room.max_players} AGENTS</span>
        {isSelected && <span style={{ color: 'var(--cyan)', fontSize: '10px', letterSpacing: '2px' }}>● JOINED</span>}
      </div>
    </div>
  )
}

// ─── Create room card ─────────────────────────────────────────────────────────
function CreateRoomCard({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div
      onClick={loading ? undefined : onClick}
      style={{
        background: 'rgba(255,23,68,0.04)', border: '1px dashed rgba(255,23,68,0.3)',
        padding: '24px', cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s', textAlign: 'center',
        clipPath: 'polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '140px', gap: '10px', opacity: loading ? 0.5 : 1,
      }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,23,68,0.08)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,23,68,0.04)' }}
    >
      <span style={{ fontSize: '28px' }}>{loading ? '⏳' : '+'}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--red)', letterSpacing: '3px' }}>
        {loading ? 'CREATING...' : 'CREATE NEW ROOM'}
      </span>
    </div>
  )
}

// ─── Waiting panel shown to non-leaders while in lobby ───────────────────────
function WaitingForLeader({ players, playerId, roomCode, onLeave }: {
  players: { player_id: string; nickname: string; is_leader: boolean }[]
  playerId: string | null
  roomCode: string | null
  onLeave: () => void
}) {
  return (
    <div style={{
      maxWidth: '560px', margin: '0 auto', textAlign: 'center',
      padding: '48px 32px',
      background: 'var(--card)', border: '1px solid var(--border)',
      clipPath: 'polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px))',
    }}>
      {/* Pulsing icon */}
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 24px',
        background: 'rgba(255,183,0,0.08)', border: '2px solid rgba(255,183,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
        animation: 'waitPulse 2s ease-in-out infinite',
      }}>⏳</div>

      <style>{`
        @keyframes waitPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,183,0,0.3); }
          50%      { box-shadow: 0 0 0 12px rgba(255,183,0,0); }
        }
      `}</style>

      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '11px',
        color: '#ffb700', letterSpacing: '3px', marginBottom: '12px',
      }}>
        ROOM {roomCode}
      </div>
      <h3 style={{
        fontFamily: 'var(--font-head)', fontSize: '28px',
        letterSpacing: '3px', color: '#fff', marginBottom: '8px',
      }}>
        WAITING FOR LEADER
      </h3>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: '12px',
        color: 'var(--muted)', letterSpacing: '1px', marginBottom: '32px',
      }}>
        The room leader will choose difficulty and start the game for everyone.
      </p>

      {/* Live player list */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '28px' }}>
        {players.map(p => (
          <span key={p.player_id} style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '1px',
            padding: '5px 14px',
            color: p.player_id === playerId ? '#00e5ff' : p.is_leader ? '#ffb700' : 'var(--muted)',
            background: p.player_id === playerId ? 'rgba(0,229,255,0.08)' : p.is_leader ? 'rgba(255,183,0,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${p.player_id === playerId ? 'rgba(0,229,255,0.3)' : p.is_leader ? 'rgba(255,183,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
          }}>
            {p.nickname}{p.is_leader ? ' ★' : ''}{p.player_id === playerId ? ' (you)' : ''}
          </span>
        ))}
      </div>

      <button
        onClick={onLeave}
        style={{
          background: 'transparent', border: '1px solid rgba(255,23,68,0.3)',
          color: 'rgba(255,23,68,0.6)', fontFamily: 'var(--font-mono)',
          fontSize: '11px', letterSpacing: '2px', padding: '8px 20px', cursor: 'pointer',
        }}
      >
        LEAVE ROOM
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RoomSection() {
  const router = useRouter()

  const [agentName, setAgentName] = useState('')
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>('easy')
  const [modalOpen, setModalOpen] = useState(false)
  const [liveRooms, setLiveRooms] = useState<RoomListItem[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [launching, setLaunching] = useState(false)

  const { toast, show: showToast } = useToast()

  // Use a ref so handleGameStarting always reads the latest roomCode/playerId
  // without being a dependency that causes useRoom to re-initialise
  const sessionRef = useRef<{ roomCode: string | null; playerId: string | null }>({
    roomCode: null,
    playerId: null,
  })

  const handleGameStarting = useCallback((difficulty: string) => {
    setLaunching(true)
    const { roomCode, playerId } = sessionRef.current
    const params = `?room=${roomCode}&player=${playerId}`
    // All games start with dynamic call simulation
    router.push(`/simulation/call${params}`)
  }, [router])

  const {
    state, error, roomCode, playerId, isLeader,
    connected, players, create, join, leave, startGame,
  } = useRoom(handleGameStarting)

  // Keep ref in sync with latest values
  useEffect(() => {
    sessionRef.current = { roomCode, playerId }
  }, [roomCode, playerId])

  const isInRoom = state === 'lobby' && !!roomCode
  const isLoading = state === 'loading'

  // Poll live rooms every 3 s
  useEffect(() => {
    const load = () => listRooms().then(setLiveRooms).catch(() => { })
    load()
    const id = setInterval(load, 3000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (error) showToast('ERROR', error)
  }, [error]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!agentName.trim()) { showToast('MISSING NAME', 'Enter your agent name first.'); return }
    await create(agentName.trim())
  }

  const handleJoinByCode = async (code: string) => {
    if (!agentName.trim()) { showToast('MISSING NAME', 'Enter your agent name first.'); return }
    if (code.length !== 6) { showToast('INVALID CODE', 'Room code must be 6 characters.'); return }
    await join(agentName.trim(), code)
    showToast('ROOM JOINED', `Connected to room ${code.toUpperCase()}`)
  }

  const handleJoinLive = async (room: RoomListItem) => {
    if (isInRoom) { showToast('ALREADY IN ROOM', `You are already in room ${roomCode}.`); return }
    if (room.status !== 'waiting') { showToast('ROOM UNAVAILABLE', 'This room is not accepting players.'); return }
    if (room.player_count >= room.max_players) { showToast('ROOM FULL', 'This room is at capacity.'); return }
    if (!agentName.trim()) { showToast('MISSING NAME', 'Enter your agent name first.'); return }
    await join(agentName.trim(), room.room_code)
    showToast('ROOM JOINED', `Connected to room ${room.room_code}`)
  }

  const handleLaunch = () => {
    setModalOpen(false)
    startGame(selectedDiff)
    // Navigation happens via game_starting WS event received by handleGameStarting
    // which is already wired to router.push with roomCode+playerId in the URL
  }

  return (
    <section id="rooms" style={{ position: 'relative', zIndex: 2, padding: '80px 40px' }}>

      {/* Step 1 — Name */}
      <SectionHeader
        tag="// step_01 — identify yourself"
        title="SET YOUR" titleRed="AGENT NAME"
        desc="Choose a codename. No signup required — just enter a name and join a room."
      />
      <NameInput value={agentName} onChange={setAgentName} />

      {/* Step 2 — Room */}
      <SectionHeader
        tag="// step_02 — pick a room"
        title="JOIN A" titleRed="ROOM"
        desc="Create a new room or join an existing one. Rooms hold up to 6 players."
      />

      {/* Room grid — hidden once in lobby */}
      {!isInRoom && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px', maxWidth: '1100px', margin: '0 auto 24px',
          }}>
            {liveRooms.map(room => (
              <LiveRoomCard
                key={room.room_code}
                room={room}
                isSelected={roomCode === room.room_code}
                myPlayerId={playerId}
                onClick={() => handleJoinLive(room)}
              />
            ))}
            <CreateRoomCard onClick={handleCreate} loading={isLoading} />
          </div>

          {/* Manual join by code */}
          <div style={{ maxWidth: '480px', margin: '0 auto 48px', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              maxLength={6}
              placeholder="Have a room code? Enter it here…"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              style={{
                flex: 1, background: 'var(--card)',
                border: '1px solid var(--border)', color: '#fff',
                fontFamily: 'var(--font-mono)', fontSize: '13px',
                padding: '12px 16px', letterSpacing: '2px', outline: 'none',
                clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--red)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
            <button
              onClick={() => handleJoinByCode(joinCode)}
              disabled={isLoading}
              style={{
                background: 'rgba(255,23,68,0.1)', border: '1px solid var(--red)',
                color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '11px',
                letterSpacing: '2px', padding: '12px 20px', cursor: 'pointer',
                clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
              }}
            >JOIN</button>
          </div>
        </>
      )}

      {/* ── IN LOBBY ── */}
      {isInRoom && (
        <div style={{ maxWidth: '1100px', margin: '0 auto 60px' }}>

          {/* ── NON-LEADER: waiting panel ── */}
          {!isLeader && (
            <WaitingForLeader
              players={players}
              playerId={playerId}
              roomCode={roomCode}
              onLeave={leave}
            />
          )}

          {/* ── LEADER: lobby panel + controls ── */}
          {isLeader && (
            <div style={{
              background: 'var(--card)', border: '1px solid rgba(255,183,0,0.3)',
              padding: '32px 36px',
              clipPath: 'polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px))',
            }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: connected ? '#00e676' : '#ff1744',
                    boxShadow: connected ? '0 0 8px #00e676' : 'none',
                    display: 'inline-block',
                  }} />
                  <span style={{ fontFamily: 'var(--font-head)', fontSize: '20px', letterSpacing: '3px', color: '#fff' }}>
                    ROOM <span style={{ color: 'var(--red)' }}>{roomCode}</span>
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#ffb700',
                    background: 'rgba(255,183,0,0.1)', border: '1px solid rgba(255,183,0,0.3)',
                    padding: '3px 10px', letterSpacing: '2px',
                  }}>YOU ARE LEADER ★</span>
                </div>
                <button
                  onClick={leave}
                  style={{
                    background: 'transparent', border: '1px solid rgba(255,23,68,0.3)',
                    color: 'rgba(255,23,68,0.6)', fontFamily: 'var(--font-mono)',
                    fontSize: '10px', letterSpacing: '2px', padding: '5px 14px', cursor: 'pointer',
                  }}
                >LEAVE ROOM</button>
              </div>

              {/* Connected agents */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px',
                  color: 'var(--muted)', letterSpacing: '3px', marginBottom: '12px',
                }}>
                  AGENTS IN ROOM — {players.length}/6
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {players.map(p => (
                    <span key={p.player_id} style={{
                      fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '1px',
                      padding: '5px 14px',
                      color: p.player_id === playerId ? '#00e5ff' : 'var(--muted)',
                      background: p.player_id === playerId ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${p.player_id === playerId ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                      {p.nickname}{p.is_leader ? ' ★' : ''}
                    </span>
                  ))}
                  {/* Empty slots */}
                  {Array.from({ length: Math.max(0, 6 - players.length) }).map((_, i) => (
                    <span key={`empty-${i}`} style={{
                      fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '1px',
                      padding: '5px 14px', color: 'rgba(255,255,255,0.15)',
                      border: '1px dashed rgba(255,255,255,0.08)',
                    }}>WAITING…</span>
                  ))}
                </div>
              </div>

              {/* Share code */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                padding: '14px 20px', marginBottom: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--muted)', letterSpacing: '2px' }}>
                  SHARE CODE:
                </span>
                <span style={{ fontFamily: 'var(--font-head)', fontSize: '22px', letterSpacing: '6px', color: 'var(--red)' }}>
                  {roomCode}
                </span>
                <button
                  onClick={() => { navigator.clipboard.writeText(roomCode ?? ''); showToast('COPIED', `Room code ${roomCode} copied.`) }}
                  style={{
                    background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.3)',
                    color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '10px',
                    letterSpacing: '2px', padding: '5px 14px', cursor: 'pointer',
                  }}
                >COPY</button>
              </div>

              {/* ── DIFFICULTY — only the leader sees this ── */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px',
                  color: 'var(--muted)', letterSpacing: '3px', marginBottom: '16px',
                }}>
                  // step_03 — SELECT DIFFICULTY (leader only)
                </div>
                <DifficultySelect selected={selectedDiff} onChange={setSelectedDiff} />
              </div>

              {/* ── START SIMULATION — only the leader sees this ── */}
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontFamily: 'var(--font-mono)', fontSize: '11px',
                  color: 'var(--muted)', letterSpacing: '1px', marginBottom: '20px',
                }}>
                  Starting the simulation will launch it for <span style={{ color: '#fff' }}>all {players.length} agent{players.length !== 1 ? 's' : ''}</span> in this room simultaneously.
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  disabled={launching}
                  style={{
                    background: launching ? 'rgba(255,23,68,0.3)' : 'var(--red)',
                    border: 'none', color: '#fff',
                    fontFamily: 'var(--font-head)', fontSize: '18px', letterSpacing: '4px',
                    padding: '18px 56px', cursor: launching ? 'not-allowed' : 'pointer',
                    clipPath: 'polygon(16px 0%,100% 0%,calc(100% - 16px) 100%,0% 100%)',
                    transition: 'background 0.3s',
                  }}
                  onMouseEnter={e => { if (!launching) (e.currentTarget as HTMLButtonElement).style.background = 'var(--pink)' }}
                  onMouseLeave={e => { if (!launching) (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)' }}
                >
                  {launching ? 'LAUNCHING…' : 'START SIMULATION ▶'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Launching overlay for non-leaders */}
      {launching && !isLeader && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(5,5,9,0.95)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '20px',
        }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: '48px', color: 'var(--red)', letterSpacing: '4px' }}>
            LAUNCHING
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--muted)', letterSpacing: '3px' }}>
            Leader started the simulation — entering arena…
          </div>
        </div>
      )}

      {/* Confirmation modal — only reachable by leader */}
      <Modal
        isOpen={modalOpen}
        agentName={agentName}
        difficulty={selectedDiff}
        onClose={() => setModalOpen(false)}
        onConfirm={handleLaunch}
      />

      <Toast title={toast.title} message={toast.message} visible={toast.visible} />
    </section>
  )
}
