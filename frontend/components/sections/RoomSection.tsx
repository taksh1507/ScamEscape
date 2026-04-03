'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useReveal } from '@/hooks/useReveal'
import { useToast } from '@/hooks/useToast'
import { ROOMS } from '@/lib/rooms'
import type { Difficulty } from '@/lib/types'
import NameInput        from './NameInput'
import RoomGrid         from './RoomGrid'
import DifficultySelect from './DifficultySelect'
import StartZone        from './StartZone'
import Modal            from '@/components/ui/Modal'
import Toast            from '@/components/ui/Toast'

function SectionHeader({
  tag, title, titleRed, desc,
}: {
  tag: string
  title: string
  titleRed: string
  desc: string
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'visible' : ''}`}
      style={{ textAlign: 'center', marginBottom: '56px' }}
    >
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '11px',
        color: 'var(--red)', letterSpacing: '3px',
        textTransform: 'uppercase', display: 'block', marginBottom: '16px',
      }}>
        {tag}
      </span>
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
      }}>
        {desc}
      </p>
    </div>
  )
}

export default function RoomSection() {
  const router = useRouter()

  const [agentName,    setAgentName]    = useState('')
  const [selectedRoom, setSelectedRoom] = useState(-1)
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>('medium')
  const [modalOpen,    setModalOpen]    = useState(false)

  const { toast, show: showToast } = useToast()

  const handleRoomSelect = (id: number) => {
    setSelectedRoom(id)
    const room = ROOMS.find(r => r.id === id)
    showToast('ROOM JOINED', `Room ${room?.name} — slot reserved for you.`)
  }

  const handleRoomFull = () => {
    showToast('ROOM FULL', 'This room is at capacity. Choose another.')
  }

  const handleStart = () => {
    if (!agentName.trim() || selectedRoom < 0) {
      showToast('NOT READY', 'Set your name and join a room first.')
      return
    }
    setModalOpen(true)
  }

  // ── The key connection: route based on difficulty ──────────────────────────
  const handleLaunch = () => {
    setModalOpen(false)

    if (selectedDiff === 'easy') {
      router.push('/simulation/call')
      return
    }

    // Placeholders for future levels — swap these for real routes later
    if (selectedDiff === 'medium') {
      showToast('COMING SOON', 'Medium scenario is under development.')
      return
    }

    if (selectedDiff === 'hard') {
      showToast('COMING SOON', 'Hard scenario is under development.')
      return
    }
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
        desc="Rooms auto-fill with 6 players. Pick one with open slots."
      />
      <RoomGrid
        selectedRoom={selectedRoom}
        onSelect={handleRoomSelect}
        onRoomFull={handleRoomFull}
      />

      {/* Step 3 — Difficulty */}
      <div id="simulate">
        <SectionHeader
          tag="// step_03 — choose difficulty"
          title="SELECT" titleRed="DIFFICULTY"
          desc="Harder levels use more sophisticated social engineering tactics."
        />
      </div>
      <DifficultySelect selected={selectedDiff} onChange={setSelectedDiff} />

      {/* Step 4 — Launch */}
      <StartZone
        agentName={agentName}
        selectedRoom={selectedRoom}
        selectedDiff={selectedDiff}
        onStart={handleStart}
      />

      {/* Modal — passes difficulty so label shows correct scenario */}
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