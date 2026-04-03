'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRound2Socket, Round2Event, ScammerProfile, WhatsAppMessage } from '@/hooks/useRound2Socket'
import { useToast } from '@/hooks/useToast'

type Round2State = 'loading' | 'active' | 'completed' | 'error'

interface Props {
  roomCode: string | null
  playerId: string | null
}

// ─── Scammer Header Component ───────────────────────────────────────────────

function ScammerHeader({ scammer, isOnline }: { scammer: ScammerProfile; isOnline: boolean }) {
  return (
    <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-full bg-gray-300 overflow-hidden">
          <img src={scammer.profile_picture} alt={scammer.name} className="w-full h-full object-cover" />
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            {scammer.name}
            {scammer.has_verified_badge && (
              <span className="text-blue-500 text-sm">✓</span>
            )}
          </h3>
          <p className="text-xs text-gray-500">
            {isOnline ? 'Active now' : `${scammer.type}`}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Message Bubble Component ───────────────────────────────────────────────

function MessageBubble({ message, isOwn }: { message: WhatsAppMessage; isOwn: boolean }) {
  const timeStr = new Date(message.timestamp * 1000).toLocaleTimeString(
    [],
    { hour: '2-digit', minute: '2-digit' }
  )

  return (
    <div className={`flex mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs px-4 py-2 rounded-2xl ${
          isOwn
            ? 'bg-blue-500 text-white rounded-br-none'
            : 'bg-gray-200 text-gray-900 rounded-bl-none'
        }`}
      >
        <p className="text-sm break-words">{message.content}</p>
        {message.has_pressure && !isOwn && (
          <p className="text-xs mt-1 opacity-75">⚠️ Time pressure applied</p>
        )}
        <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
          {timeStr}
        </p>
      </div>
    </div>
  )
}

// ─── Red Flag Warning Component ──────────────────────────────────────────────

function RedFlagWarning({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-3 my-2 rounded">
      <p className="text-xs font-semibold text-red-700">⚠️ Red Flags Detected:</p>
      <ul className="text-xs text-red-600 mt-1 list-disc list-inside">
        {flags.slice(0, 3).map((flag, i) => (
          <li key={i}>{flag}</li>
        ))}
      </ul>
    </div>
  )
}

// ─── Power-Ups Menu Component ───────────────────────────────────────────────

function PowerUpsMenu({
  helpersOpen,
  setHelpersOpen,
  onUsePowerUp,
  availablePowerUps,
}: {
  helpersOpen: boolean
  setHelpersOpen: (open: boolean) => void
  onUsePowerUp: (powerUp: string) => void
  availablePowerUps: any
}) {
  const powerups = [
    { name: 'block_caller', label: '🛑 Block', color: 'bg-red-100 text-red-700' },
    { name: 'check_authenticity', label: '🔍 Verify', color: 'bg-yellow-100 text-yellow-700' },
    { name: 'delay_response', label: '⏳ Delay', color: 'bg-blue-100 text-blue-700' },
    { name: 'report_scam', label: '🚨 Report', color: 'bg-orange-100 text-orange-700' },
    { name: 'call_bank', label: '☎️ Call Bank', color: 'bg-purple-100 text-purple-700' },
  ]

  return (
    <div className="absolute bottom-20 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-48">
      <p className="text-xs font-semibold text-gray-700 mb-2">⚡ Defense Tools</p>
      <div className="space-y-2">
        {powerups.map((pu) => (
          <button
            key={pu.name}
            onClick={() => {
              onUsePowerUp(pu.name)
              setHelpersOpen(false)
            }}
            className={`w-full text-left text-xs px-3 py-2 rounded flex justify-between items-center hover:opacity-80 transition ${pu.color}`}
          >
            <span>{pu.label}</span>
            <span className="text-xs font-mono">
              {availablePowerUps?.[pu.name] ?? '?'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Timer Component ────────────────────────────────────────────────────────

function CountdownTimer({
  timeRemaining,
  pressureLevel,
}: {
  timeRemaining: number
  pressureLevel: 'low' | 'medium' | 'high' | 'critical'
}) {
  const colors = {
    low: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    high: 'text-orange-600 bg-orange-50',
    critical: 'text-red-600 bg-red-50',
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg font-mono font-bold text-sm border-2 ${colors[pressureLevel]}`}>
      ⏰ {formatTime(timeRemaining)}
    </div>
  )
}

// ─── Stats Sidebar Component ────────────────────────────────────────────────

function StatsSidebar({ analytics, triggerRefresh }: { analytics: any; triggerRefresh: () => void }) {
  return (
    <div className="h-full bg-gray-50 border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="font-semibold text-gray-900 mb-4">📊 Analysis</h3>

      {analytics && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">Scam Progress</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-red-500 h-2 rounded-full transition-all"
                style={{ width: `${analytics.scam_progress}%` }}
              ></div>
            </div>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {Math.round(analytics.scam_progress)}%
            </p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">Warnings Ignored</p>
            <p className="text-lg font-bold text-orange-600">{analytics.warnings?.total_warnings_ignored ?? 0}</p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600">Behavior</p>
            <p className="text-xs text-gray-900 truncate">
              {analytics.behavior?.profile ?? 'Analyzing...'}
            </p>
          </div>

          <button
            onClick={triggerRefresh}
            className="w-full bg-blue-500 text-white text-xs py-2 rounded hover:bg-blue-600 transition"
          >
            Refresh Stats
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function WhatsAppSimulation({ roomCode, playerId }: Props) {
  const router = useRouter()
  const { toast, show: showToast } = useToast()

  // State
  const [state, setState] = useState<Round2State>('loading')
  const [scammer, setScammer] = useState<ScammerProfile | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [helpersOpen, setHelpersOpen] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(900) // 15 minutes (increased from 120)
  const [pressureLevel, setPressureLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low')
  const [detectedRedFlags, setDetectedRedFlags] = useState<string[]>([])
  const [gameCompleted, setGameCompleted] = useState(false)
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [showStats, setShowStats] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // WebSocket
  const { connected, startGame, sendMessage, takeAction, usePowerUp } = useRound2Socket(
    roomCode,
    playerId,
    (event: Round2Event) => {
      handleGameEvent(event)
    }
  )

  const handleGameEvent = (event: Round2Event) => {
    switch (event.event) {
      case 'round2_start':
        setScammer(event.scammer)
        setState('active')
        break

      case 'new_message':
        const newMsg: WhatsAppMessage = {
          id: event.message.id,
          sender: event.message.sender,
          content: event.message.content,
          type: event.message.type,
          timestamp: event.message.timestamp,
          has_pressure: event.message.has_pressure,
          is_own: false,
        }
        setMessages((prev) => [...prev, newMsg])
        scrollToBottom()
        break

      case 'pressure_message':
        showToast('⏰ TIME PRESSURE', event.message)
        setPressureLevel((event.pressure_level?.toLowerCase() ?? 'high') as any)
        break

      case 'action_processed':
        // Check if game ended
        if (event.status === 'game_ended') {
          setGameCompleted(true)
          setState('completed')
          
          // Extract score from game result
          const score = event.game_result?.total_score ?? (event.result === 'successfully_blocked' ? 85 : 0)
          setFinalScore(score)
          setAnalytics(event.game_result)
          
          if (event.result === 'fell_for_scam') {
            showToast('SCAMMED', '❌ You fell for the scam!')
          } else if (event.result === 'successfully_blocked') {
            showToast('SURVIVED', '✅ You successfully blocked the scammer!')
          }
        } else if (event.action === 'share_otp') {
          // Fallback for old behavior
          setGameCompleted(true)
          setState('completed')
          setFinalScore(0)
          showToast('SCAMMED', '❌ You fell for the scam!')
        }
        break

      case 'error':
        showToast('ERROR', event.message)
        setState('error')
        break
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Timer countdown
  useEffect(() => {
    if (state !== 'active' || gameCompleted) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setGameCompleted(true)
          setState('completed')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [state, gameCompleted])

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newMsg: WhatsAppMessage = {
      id: `own_${Date.now()}`,
      sender: 'You',
      content: inputValue,
      type: 'text',
      timestamp: Date.now() / 1000,
      has_pressure: false,
      is_own: true,
    }

    setMessages((prev) => [...prev, newMsg])
    sendMessage(inputValue)
    setInputValue('')
    scrollToBottom()
  }

  const handleAction = (action: string) => {
    takeAction(action)
    showToast('ACTION', `You ${action}`)
  }

  const handlePowerUp = (powerUp: string) => {
    usePowerUp(powerUp)
    showToast('POWER-UP', `Using: ${powerUp}`)
  }

  // Detect pressure level
  useEffect(() => {
    if (timeRemaining > 60) setPressureLevel('low')
    else if (timeRemaining > 30) setPressureLevel('medium')
    else if (timeRemaining > 10) setPressureLevel('high')
    else setPressureLevel('critical')
  }, [timeRemaining])

  // Auto-start game when WebSocket connects
  useEffect(() => {
    if (connected && state === 'loading') {
      startGame()
    }
  }, [connected, state, startGame])

  if (state === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h1>
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

  if (!scammer || state === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center text-white">
          <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-xl font-semibold">Initializing Round 2...</p>
          <p className="text-sm mt-2 opacity-75">WhatsApp Scam Simulation</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white relative">
        {/* Header */}
        <ScammerHeader scammer={scammer} isOnline={true} />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
          {messages.map((msg) => (
            <div key={msg.id}>
              <MessageBubble message={msg} isOwn={msg.is_own} />
            </div>
          ))}
          {detectedRedFlags.length > 0 && <RedFlagWarning flags={detectedRedFlags} />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex gap-2  mb-2">
            <button
              onClick={() => handleAction('ignore')}
              className="flex-1 bg-green-100 text-green-700 text-xs py-2 rounded hover:bg-green-200 transition"
            >
              ✓ Ignore
            </button>
            <button
              onClick={() => handleAction('ask_question')}
              className="flex-1 bg-yellow-100 text-yellow-700 text-xs py-2 rounded hover:bg-yellow-200 transition"
            >
              ? Ask Question
            </button>
            <button
              onClick={() => handleAction('block')}
              className="flex-1 bg-red-100 text-red-700 text-xs py-2 rounded hover:bg-red-200 transition"
            >
              🛑 Block
            </button>
          </div>

          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your reply..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 transition"
            >
              →
            </button>
          </div>
        </div>

        {/* Floating Timer */}
        <CountdownTimer timeRemaining={timeRemaining} pressureLevel={pressureLevel} />

        {/* Power-Ups Button */}
        <button
          onClick={() => setHelpersOpen(!helpersOpen)}
          className="fixed bottom-4 right-4 w-14 h-14 bg-purple-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-purple-600 transition text-xl"
        >
          ⚡
        </button>

        {helpersOpen && (
          <PowerUpsMenu
            helpersOpen={helpersOpen}
            setHelpersOpen={setHelpersOpen}
            onUsePowerUp={handlePowerUp}
            availablePowerUps={analytics?.available_power_ups}
          />
        )}

        {/* Stats Button */}
        <button
          onClick={() => setShowStats(!showStats)}
          className="fixed bottom-20 right-4 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition text-lg"
        >
          📊
        </button>
      </div>

      {/* Stats Sidebar */}
      {showStats && <StatsSidebar analytics={analytics} triggerRefresh={() => {}} />}

      {/* Game Over Screen */}
      {gameCompleted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md text-center">
            <h1 className="text-2xl font-bold mb-4">
              {finalScore! > 50 ? '✅ You Survived!' : '❌ You Got Scammed!'}
            </h1>
            <p className="text-4xl font-bold text-blue-600 mb-4">{finalScore}</p>
            <p className="text-gray-600 mb-6">
              {finalScore! > 50
                ? 'Great job detecting the scam! Stay vigilant online.'
                : 'You fell for it. Learn from the red flags and try again!'}
            </p>
            <button
              onClick={() => router.push('/rooms')}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 font-semibold"
            >
              Back to Rooms
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
