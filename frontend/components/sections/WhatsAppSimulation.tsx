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
    <div style={{ background: 'var(--card)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px', position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,23,68,0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', position: 'relative' }}>
          👤
          {isOnline && (
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', background: '#00e676', borderRadius: '50%', border: '2px solid #fff' }}></div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            {scammer.name}
            {scammer.has_verified_badge && (
              <span style={{ color: 'var(--cyan)', fontSize: '12px' }}>✓</span>
            )}
          </h3>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0 0' }}>
            {isOnline ? 'Active now' : `${scammer.type}`}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Message Bubble Component ───────────────────────────────────────────────

function MessageBubble({ 
  message, 
  isOwn,
  onActionClick,
  isWaiting
}: { 
  message: WhatsAppMessage; 
  isOwn: boolean;
  onActionClick?: (action: string) => void;
  isWaiting?: boolean;
}) {
  const timeStr = new Date(message.timestamp * 1000).toLocaleTimeString(
    [],
    { hour: '2-digit', minute: '2-digit' }
  )

  // Check if action is risky
  const isRiskyAction = (action: string) => {
    return ['confirm_payment', 'share_otp', 'share_card_details', 'click_link'].includes(action)
  }

  // Get risk indicator
  const getRiskColor = (risk: string) => {
    if (risk === 'high') return 'bg-red-100 text-red-700 border border-red-300'
    if (risk === 'medium') return 'bg-yellow-100 text-yellow-700 border border-yellow-300'
    return 'bg-green-100 text-green-700 border border-green-300'
  }

  return (
    <div style={{ display: 'flex', marginBottom: '16px', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '512px' }}>
        <div
          style={{
            maxWidth: '384px',
            padding: '12px 16px',
            borderRadius: '16px',
            background: isOwn ? 'var(--red)' : 'var(--card)',
            color: isOwn ? '#fff' : 'rgba(255,255,255,0.8)',
            border: isOwn ? 'none' : '1px solid rgba(255,23,68,0.1)',
            borderBottomRightRadius: isOwn ? '4px' : '16px',
            borderBottomLeftRadius: isOwn ? '16px' : '4px'
          }}
        >
          <p style={{ fontSize: '14px', margin: 0, wordWrap: 'break-word', lineHeight: '1.4' }}>{message.content}</p>
          {message.has_pressure && !isOwn && (
            <p style={{ fontSize: '12px', marginTop: '6px', opacity: 0.75 }}>⚠️ Time pressure applied</p>
          )}
          <p style={{ fontSize: '11px', marginTop: '6px', opacity: 0.7 }}>
            {timeStr}
          </p>
        </div>

        {/* 🔥 Response Options - Horizontal Layout */}
        {!isOwn && message.response_options && message.response_options.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {message.response_options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => onActionClick?.(option.action)}
                disabled={isWaiting}
                style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  border: isRiskyAction(option.action) ? '1px solid var(--red)' : '1px solid #00e676',
                  background: isRiskyAction(option.action) ? 'rgba(255,23,68,0.1)' : 'rgba(0,230,118,0.1)',
                  color: isRiskyAction(option.action) ? 'var(--red)' : '#00e676',
                  cursor: isWaiting ? 'not-allowed' : 'pointer',
                  opacity: isWaiting ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => !isWaiting && ((e.currentTarget as any).style.opacity = '0.8')}
                onMouseLeave={(e) => !isWaiting && ((e.currentTarget as any).style.opacity = '1')}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Red Flag Warning Component ──────────────────────────────────────────────

function RedFlagWarning({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null

  return (
    <div style={{ background: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.2)', padding: '12px', borderRadius: '8px', margin: '8px 0' }}>
      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--red)', margin: 0 }}>⚠️ Red Flags Detected:</p>
      <ul style={{ fontSize: '12px', color: 'rgba(255,120,120,0.9)', marginTop: '8px', listStyle: 'disc', listStylePosition: 'inside', margin: '8px 0 0 0', padding: 0 }}>
        {flags.slice(0, 3).map((flag, i) => (
          <li key={i} style={{ margin: '4px 0' }}>{flag}</li>
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
    { name: 'block_caller', label: '🛑 Block', color: 'var(--red)' },
    { name: 'check_authenticity', label: '🔍 Verify', color: '#f0ad4e' },
    { name: 'delay_response', label: '⏳ Delay', color: 'var(--cyan)' },
    { name: 'report_scam', label: '🚨 Report', color: '#ffb74d' },
    { name: 'call_bank', label: '☎️ Call Bank', color: '#ab47bc' },
  ]

  return (
    <div style={{ position: 'absolute', bottom: '80px', right: '16px', background: 'var(--card)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', width: '192px', zIndex: 100 }}>
      <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>⚡ Defense Tools</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {powerups.map((pu) => (
          <button
            key={pu.name}
            onClick={() => {
              onUsePowerUp(pu.name)
              setHelpersOpen(false)
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              fontSize: '12px',
              padding: '8px 12px',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: `1px solid ${pu.color}`,
              background: `rgba(${pu.color === 'var(--red)' ? '255,23,68' : '0,230,118'},0.1)`,
              color: pu.color,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.currentTarget as any).style.opacity = '0.8'}
            onMouseLeave={(e) => (e.currentTarget as any).style.opacity = '1'}
          >
            {pu.label}
            <span>›</span>
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

// ─── Utility Functions ──────────────────────────────────────────────────────

/**
 * Saves game result to localStorage for leaderboard display
 * @param gameResult - Result from backend containing round1_score, round2_score, total_score
 * @param playerId - Player ID
 */
function saveGameResultToLeaderboard(gameResult: any, playerId: string | null) {
  if (!playerId) return

  try {
    // Get existing scores from localStorage
    const leaderboardData = localStorage.getItem('leaderboard_scores')
    let scores: any[] = leaderboardData ? JSON.parse(leaderboardData) : []

    // Extract scores
    const round1_score = gameResult?.round1_score ?? 0
    const round2_score = gameResult?.round2_score ?? 0
    const total_score = gameResult?.total_score ?? (round1_score + round2_score)

    // Try to get player codename from localStorage
    const playerInfo = localStorage.getItem(`player_${playerId}`)
    const playerData = playerInfo ? JSON.parse(playerInfo) : null
    const codename = playerData?.codename || `PLAYER_${playerId.substring(0, 8).toUpperCase()}`

    // Create new entry
    const newEntry = {
      playerId,
      codename,
      round1_score,
      round2_score,
      total_score,
      timestamp: new Date().toISOString(),
    }

    // Check if player already has results (update if exists)
    const existingIndex = scores.findIndex((s: any) => s.playerId === playerId)
    if (existingIndex >= 0) {
      scores[existingIndex] = newEntry
    } else {
      scores.push(newEntry)
    }

    // Sort by total score descending
    scores.sort((a: any, b: any) => b.total_score - a.total_score)

    // Save back to localStorage
    localStorage.setItem('leaderboard_scores', JSON.stringify(scores))
    console.log('✅ Game result saved to localStorage:', newEntry)
  } catch (error) {
    console.error('Error saving game result:', error)
  }
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
  
  // 🔥 RISKY ACTION HANDLING
  const [isWaiting, setIsWaiting] = useState(false)
  const [showScamWarning, setShowScamWarning] = useState(false)
  const [lastRiskyAction, setLastRiskyAction] = useState<string | null>(null)

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
          response_options: event.message.response_options,  // 🔥 Include response options
        }
        setMessages((prev) => [...prev, newMsg])
        scrollToBottom()
        break

      case 'pressure_message':
        showToast('⏰ TIME PRESSURE', event.message)
        setPressureLevel((event.pressure_level?.toLowerCase() ?? 'high') as any)
        break

      case 'action_processed':
        // Always show the scammer's response message if provided
        if (event.response_message) {
          const responseMsg: WhatsAppMessage = {
            id: `response_${Date.now()}`,
            sender: scammer?.name || 'Scammer',
            content: event.response_message,
            type: 'text',
            timestamp: Date.now() / 1000,
            has_pressure: false,
            is_own: false,
            response_options: event.response_options,
          }
          setMessages((prev) => [...prev, responseMsg])
          scrollToBottom()
        }

        // Check if game ended
        if (event.status === 'game_ended') {
          setGameCompleted(true)
          setState('completed')
          
          // Extract score from game result
          const score = event.game_result?.total_score ?? (event.result === 'successfully_blocked' ? 85 : 0)
          setFinalScore(score)
          setAnalytics(event.game_result)
          
          // 🔥 Save to leaderboard
          saveGameResultToLeaderboard(event.game_result, playerId)
          
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
          // 🔥 Save to leaderboard with 0 score
          saveGameResultToLeaderboard({ total_score: 0, round1_score: 0, round2_score: 0 }, playerId)
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
    // 🔥 Check if this is a risky action
    const riskyActions = ['confirm_payment', 'share_otp', 'share_card_details', 'click_link']
    
    if (riskyActions.includes(action)) {
      // Show warning pop-up
      setIsWaiting(true)
      setLastRiskyAction(action)
      setShowScamWarning(true)
      showToast('⚠️ SCAMMED!', 'You fell for the scam! Sending money would have compromised your security!')
      
      // After 2 seconds, end the game
      setTimeout(() => {
        takeAction(action)
      }, 2000)
    } else {
      // Safe action - just send it
      takeAction(action)
      showToast('✓ Action', `You ${action}`)
    }
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
      <div style={{ display: 'flex', height: '100vh', background: 'var(--dark)', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        {/* Chat-like Loading Container */}
        <div style={{ width: '100%', maxWidth: '400px', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Header Skeleton */}
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--cyan) 0%, var(--red) 100%)', opacity: 0.6 }}></div>
            <div style={{ flex: 1 }}>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '8px', width: '80%' }}></div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', width: '60%' }}></div>
            </div>
          </div>

          {/* Chat Messages Skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ 
                display: 'flex', 
                justifyContent: i === 2 ? 'flex-end' : 'flex-start',
                animation: `fadeInOut 2s ease-in-out ${i * 0.3}s infinite`
              }}>
                <div style={{
                  background: i === 2 ? 'var(--cyan)' : 'rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  maxWidth: '200px',
                  height: '16px'
                }}></div>
              </div>
            ))}
          </div>

          {/* Loading Status */}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '12px' }}>
              {[0, 1, 2].map((i) => (
                <div 
                  key={i}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--cyan)',
                    animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`
                  }}
                ></div>
              ))}
            </div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Initializing Round 2</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>💬 WhatsApp Scam Simulation</p>
          </div>

          {/* Animated Chat Icons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '8px', opacity: 0.6 }}>
            {['💭', '📱', '🔐'].map((icon, i) => (
              <div
                key={i}
                style={{
                  fontSize: '24px',
                  animation: `float 3s ease-in-out ${i * 0.4}s infinite`
                }}
              >
                {icon}
              </div>
            ))}
          </div>

          {/* Style Animations */}
          <style>{`
            @keyframes bounce {
              0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
              40% { transform: translateY(-8px); opacity: 1; }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-8px); }
            }
            @keyframes fadeInOut {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.7; }
            }
          `}</style>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--dark)' }}>
      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--dark)', position: 'relative' }}>
        {/* Header */}
        <ScammerHeader scammer={scammer} isOnline={true} />

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: 'var(--dark)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {messages.map((msg) => (
            <div key={msg.id}>
              <MessageBubble 
                message={msg} 
                isOwn={msg.is_own}
                onActionClick={handleAction}
                isWaiting={isWaiting}
              />
            </div>
          ))}
          {detectedRedFlags.length > 0 && <RedFlagWarning flags={detectedRedFlags} />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Hidden (Response option buttons used instead) */}

        {/* Timer and other UI elements */}
        <CountdownTimer timeRemaining={timeRemaining} pressureLevel={pressureLevel} />
      </div>

      {/* 🔥 SCAM WARNING POP-UP - DARK THEME */}
      {showScamWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '32px', maxWidth: '520px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(255,23,68,0.3)', border: '2px solid rgba(255,23,68,0.3)' }}>
            {/* Warning Icon */}
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
            
            {/* Main Title */}
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#ff5252', marginBottom: '12px', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              YOU ARE BEING SCAMMED!
            </h1>
            
            {/* Action Taken */}
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#ff5252', marginBottom: '16px', padding: '12px', background: 'rgba(255,23,68,0.15)', borderRadius: '8px' }}>
              {lastRiskyAction === 'confirm_payment' && '💰 You would have sent money!'}
              {lastRiskyAction === 'share_otp' && '🔐 You would have shared your OTP!'}
              {lastRiskyAction === 'share_card_details' && '💳 You would have shared your card details!'}
              {lastRiskyAction === 'click_link' && '🔗 You would have clicked a malicious link!'}
            </p>
            
            {/* Warning Message */}
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', lineHeight: 1.6 }}>
              The scammer would have stolen your money and personal information.
            </p>
            
            {/* Tips Section */}
            <div style={{ background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.2)', borderRadius: '12px', padding: '16px', textAlign: 'left', marginBottom: '24px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#ff5252', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🛡️</span> Important Tips:
              </p>
              <ul style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><span style={{ color: '#00e676', marginTop: '2px' }}>✓</span> Never share OTP with anyone - banks never ask for it</li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><span style={{ color: '#00e676', marginTop: '2px' }}>✓</span> Banks never request card details via messages</li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><span style={{ color: '#00e676', marginTop: '2px' }}>✓</span> Urgent money requests are classic scam tactics</li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><span style={{ color: '#00e676', marginTop: '2px' }}>✓</span> Always verify by calling official numbers</li>
              </ul>
            </div>
            
            {/* End Game Button */}
            <button
              onClick={() => {
                // Save scammed result before navigating
                const scammedResult = { total_score: 0, round1_score: 0, round2_score: 0 }
                saveGameResultToLeaderboard(scammedResult, playerId)
                
                // Don't show the game completion pop-up - go directly to main page
                setShowScamWarning(false)
                setGameCompleted(false)
                setIsWaiting(false)
                
                // Navigate to main page
                router.push(`/`)
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #ff1744 0%, #d32f2f 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 24px',
                fontWeight: 700,
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(255,23,68,0.4)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as any).style.transform = 'translateY(-2px)';
                (e.currentTarget as any).style.boxShadow = '0 8px 25px rgba(255,23,68,0.6)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as any).style.transform = 'translateY(0)';
                (e.currentTarget as any).style.boxShadow = '0 4px 15px rgba(255,23,68,0.4)';
              }}
            >
              End Game & Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen - Dark Theme */}
      {gameCompleted && !showScamWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '32px', maxWidth: '480px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '20px', color: finalScore! > 50 ? '#00e676' : '#ff5252' }}>
              {finalScore! > 50 ? '✅ You Survived!' : '❌ You Got Scammed!'}
            </h1>
            <p style={{ fontSize: '48px', fontWeight: 900, color: finalScore! > 50 ? '#00e676' : '#ff5252', marginBottom: '16px' }}>{finalScore}</p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', marginBottom: '24px', lineHeight: 1.6 }}>
              {finalScore! > 50
                ? '🎉 Great job detecting the scam! Stay vigilant online and help others avoid fraud.'
                : '📚 You fell for it. These scams are designed to be convincing. Learn from the red flags!'}
            </p>
            <button
              onClick={() => router.push(`/`)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, var(--cyan) 0%, #00c853 100%)',
                color: '#000',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 24px',
                fontWeight: 700,
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(0,230,118,0.3)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as any).style.transform = 'translateY(-2px)';
                (e.currentTarget as any).style.boxShadow = '0 8px 25px rgba(0,230,118,0.5)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as any).style.transform = 'translateY(0)';
                (e.currentTarget as any).style.boxShadow = '0 4px 15px rgba(0,230,118,0.3)';
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
