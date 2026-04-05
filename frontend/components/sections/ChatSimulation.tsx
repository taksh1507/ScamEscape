'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useGameSocket } from '@/hooks/useGameSocket'
import { motion, AnimatePresence } from 'framer-motion'

const useAutoScroll = (dependency: any) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
        }
      }, 100)
    }
  }, [dependency])
  
  return scrollContainerRef
}

interface ChatMessage {
  sender: 'SCAMMER' | 'USER'
  timestamp: string
  content: string
}

interface PaymentBlock {
  link: string
  amount: string
  qr: string
  cta: string
}

interface ChatScenario {
  created_at: string
  messages: ChatMessage[]
  payment_block: PaymentBlock
}

export default function ChatSimulation({ roomCode, playerId }: { roomCode: string | null; playerId: string | null }) {
  const [scenario, setScenario] = useState<ChatScenario | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [score, setScore] = useState(0)
  const [randomScore, setRandomScore] = useState(0) // 🔴 Random score 1-100
  const [gamePhase, setGamePhase] = useState<'loading' | 'chat' | 'results' | 'payment_cleared' | 'congratulations' | 'game_finished' | 'scammed_display' | 'detected_display'>('loading')
  const [userInput, setUserInput] = useState('')
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentClicked, setPaymentClicked] = useState(false)
  const [showPaymentPopup, setShowPaymentPopup] = useState(false)  // 💰 Payment detection popup
  const [paymentStep, setPaymentStep] = useState<'initial' | 'successful' | 'scammed' | 'reported' | 'blocked'>('initial')  // 💰 Payment flow step
  const [showPersonalMsg, setShowPersonalMsg] = useState(false)  // 👤 Personal message popup
  const [showReportPopup, setShowReportPopup] = useState(false)  // 📋 Report confirmation popup
  const [personalMsgAction, setPersonalMsgAction] = useState<'end' | 'continue' | null>(null)  // 👤 Which action triggered it
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useAutoScroll(messages)

  // 🔴 Generate random score with different ranges based on result
  const generateRandomScore = (result?: string) => {
    if (result === 'detected') {
      // Congratulation: avoided scam = 60-100
      return Math.floor(Math.random() * 41) + 60
    } else {
      // Got scammed = 1-50
      return Math.floor(Math.random() * 50) + 1
    }
  }

  const handleMessage = useCallback((evt: any) => {
    console.log('ChatSimulation received event:', evt)
  }, [])

  const { submitAction } = useGameSocket(roomCode, playerId, handleMessage)
  const router = useRouter()

  const getCurrentTime = () => {
    const now = new Date()
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const fetchChatScenario = useCallback(async () => {
    if (!roomCode || !playerId) return

    const maxRetries = 3
    let retryCount = 0

    const attemptFetch = async (): Promise<void> => {
      try {
        setIsLoading(true)
        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
        const url = `${baseUrl}/chat/round2/scenario/${roomCode}/${playerId}`
        console.log(`🔗 Fetching from: ${url} (attempt ${retryCount + 1}/${maxRetries})`)
        
        // 🔥 Add timeout to fail faster (15 seconds max)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        
        const response = await fetch(url, { signal: controller.signal })
        clearTimeout(timeout)
        
        console.log('📊 Response status:', response.status)
        
        if (!response.ok) {
          const contentType = response.headers.get('content-type')
          console.log('📋 Content-Type:', contentType)
          
          let errorDetail = ''
          if (contentType?.includes('application/json')) {
            try {
              const error = await response.json()
              errorDetail = error.detail || JSON.stringify(error)
            } catch {
              errorDetail = await response.text()
            }
          } else {
            errorDetail = await response.text()
          }
          
          // 🔥 Handle rate limit errors with SHORT backoff (max 3s)
          if (response.status === 429 && retryCount < maxRetries) {
            const delayMs = Math.min(3000, Math.pow(2, retryCount) * 500)  // Cap at 3s
            console.log(`⏳ Rate limited! Retrying in ${delayMs.toFixed(0)}ms...`)
            setLoadError(`Retrying... (${retryCount + 1}/${maxRetries})`)
            
            await new Promise(resolve => setTimeout(resolve, delayMs))
            retryCount++
            return attemptFetch()
          }
          
          console.log('❌ Error detail:', errorDetail.substring(0, 500))
          throw new Error(`HTTP ${response.status}: ${errorDetail.substring(0, 200)}`)
        }

        const data = await response.json()
        console.log('✅ Scenario loaded:', data)
        setScenario(data.scenario)
        
        if (data.scenario.messages?.length > 0) {
          setMessages([data.scenario.messages[0]])
        }
        setGamePhase('chat')
        setIsLoading(false)
        setLoadError(null)
      } catch (error) {
        setIsLoading(false)
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error('🔴 Fetch error:', errorMsg)
        setLoadError(errorMsg)
      }
    }

    return attemptFetch()
  }, [roomCode, playerId])

  useEffect(() => {
    fetchChatScenario()
  }, [fetchChatScenario])

  const handleSendMessage = useCallback(async () => {
    if (!userInput.trim() || isWaitingForResponse) return

    const userMessage: ChatMessage = {
      sender: 'USER',
      timestamp: getCurrentTime(),
      content: userInput
    }
    
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setUserInput('')
    setIsWaitingForResponse(true)

    const maxRetries = 3
    let retryCount = 0

    const attemptMessage = async (): Promise<void> => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
        console.log(`📨 Sending message (attempt ${retryCount + 1}/${maxRetries})`)
        
        const response = await fetch(`${baseUrl}/chat/next-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages,
            last_sender: 'USER',
            scam_type: 'relative_emergency'
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: response.statusText }))
          const errorMsg = errorData.detail || `HTTP ${response.status}`
          
          // 🔥 Handle rate limit with retry
          if (response.status === 429 && retryCount < maxRetries) {
            const delayMs = Math.pow(2, retryCount) * 1000 + Math.random() * 1000
            console.log(`⏳ Rate limited! Retrying in ${delayMs.toFixed(0)}ms...`)
            
            // Show loading indicator with retry message
            setMessages([...updatedMessages, {
              sender: 'SCAMMER',
              timestamp: getCurrentTime(),
              content: `⏳ Service busy... retrying in ${(delayMs / 1000).toFixed(1)}s`
            }])
            
            await new Promise(resolve => setTimeout(resolve, delayMs))
            retryCount++
            return attemptMessage()
          }

          throw new Error(`API error: ${errorMsg}`)
        }

        const data = await response.json()
        const aiContent = data.message?.content || data.content || ''
        
        const aiMessage: ChatMessage = {
          sender: 'SCAMMER',
          timestamp: getCurrentTime(),
          content: aiContent
        }

        setMessages([...updatedMessages, aiMessage])
        setIsWaitingForResponse(false)
        inputRef.current?.focus()
      } catch (error) {
        console.error('Error:', error)
        setMessages([...updatedMessages, {
          sender: 'SCAMMER',
          timestamp: getCurrentTime(),
          content: '⚠️ Error loading response. Please try again.'
        }])
        setIsWaitingForResponse(false)
      }
    }

    return attemptMessage()
  }, [userInput, messages, isWaitingForResponse])

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 💰 Make Payment Handler
  const handleMakePayment = useCallback(() => {
    console.log('💳 MAKE PAYMENT CLICKED')
    setPaymentStep('successful')
  }, [])

  // 💰 After Payment Successful - Show Scammed Message then Score
  const handlePaymentSuccessful = useCallback(() => {
    console.log('💰 PAYMENT SUCCESSFUL - GENERATING RANDOM SCORE')
    const newScore = generateRandomScore('scammed')
    console.log(`🔴 GENERATED SCORE: ${newScore}/50`)
    
    // Store score to backend
    if (roomCode && playerId) {
      console.log(`📤 Saving score to backend: ${newScore}`)
      fetch(process.env.NEXT_PUBLIC_API_URL + '/game/save-round-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: roomCode.toUpperCase(),
          player_id: playerId,
          round_number: 2,
          score: newScore,
          result: 'scammed'
        })
      }).catch(e => console.warn('Failed to save scam score:', e))
    }
    
    // Update all states and transition
    setRandomScore(newScore)
    setPaymentStep('scammed')
    setShowPaymentPopup(false)
    
    // Direct transition with the score
    setTimeout(() => {
      console.log(`🎯 Transitioning to scammed_display with score: ${newScore}`)
      setGamePhase('scammed_display')
    }, 500)
  }, [roomCode, playerId])

  // 💰 Report to Authorities Handler
  const handleReport = useCallback(() => {
    console.log('📞 REPORT TO AUTHORITIES CLICKED - GENERATING RANDOM SCORE')
    const newScore = generateRandomScore('detected')
    console.log(`🟢 GENERATED SCORE: ${newScore}/100`)
    
    // Store score to backend
    if (roomCode && playerId) {
      console.log(`📤 Saving detection score to backend: ${newScore}`)
      fetch(process.env.NEXT_PUBLIC_API_URL + '/game/save-round-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: roomCode.toUpperCase(),
          player_id: playerId,
          round_number: 2,
          score: newScore,
          result: 'detected'
        })
      }).catch(e => console.warn('Failed to save detection score:', e))
    }
    
    // Update all states and transition
    setRandomScore(newScore)
    setPaymentStep('reported')
    setShowPaymentPopup(false)
    
    // Direct transition with the score
    setTimeout(() => {
      console.log(`🎯 Transitioning to detected_display with score: ${newScore}`)
      setGamePhase('detected_display')
    }, 500)
  }, [roomCode, playerId])

  // 💰 Block User Handler
  const handleBlock = useCallback(() => {
    console.log('🚫 BLOCK USER CLICKED')
    setPaymentStep('blocked')
  }, [])

  // 💰 End Payment Flow - Finalize Game
  const handleEndPaymentFlow = useCallback(() => {
    console.log('✅ PAYMENT FLOW ENDED - GAME OVER')
    setShowPaymentPopup(false)
    if (submitAction) submitAction('fell_for_scam')
    setScore(0)
    setTimeout(() => {
      console.log('🔄 Redirecting to main page after payment scam...')
      window.location.href = '/'
    }, 1000)
  }, [submitAction])

  const handleDetectScam = () => {
    console.log('🚨 Detect Scam button clicked!')
    // Show payment popup - no keyword checking
    setShowPaymentPopup(true)
  }

  // 💰 End Game Handler - Shows personal message
  const handleEndGame = () => {
    console.log('🛑 End Game - showing personal message')
    setPersonalMsgAction('end')
    setShowPersonalMsg(true)
  }

  // 👤 Confirm End Game - Finalize
  const confirmEndGame = () => {
    console.log('🛑 Game ended by user - payment detection!')
    setShowPersonalMsg(false)
    setShowPaymentPopup(false)
    if (submitAction) submitAction('fell_for_scam')
    setScore(0)
    setTimeout(() => {
      console.log('🔄 Redirecting to main page after end game...')
      window.location.href = '/'
    }, 1000)
  }

  // ❌ Continue Handler - Shows personal message
  const handleContinue = () => {
    console.log('❌ Continue Resisting - showing personal message')
    setPersonalMsgAction('continue')
    setShowPersonalMsg(true)
  }

  // 👤 Confirm Continue - Keep Playing
  const confirmContinue = () => {
    console.log('✅ You successfully detected the scam!')
    setShowPersonalMsg(false)
    setShowPaymentPopup(false)
    if (submitAction) submitAction('detected_scam')
    setScore(100)
    setTimeout(() => {
      console.log('🔄 Redirecting to main page after success...')
      window.location.href = '/'
    }, 1000)
  }

  // 💰 Reset payment step when payment popup opens
  useEffect(() => {
    if (showPaymentPopup && paymentStep !== 'initial') {
      setPaymentStep('initial')
    }
  }, [showPaymentPopup])

  // 🔴 Transition from scammed step to score display
  useEffect(() => {
    if (paymentStep === 'scammed' && randomScore > 0) {
      setTimeout(() => {
        setShowPaymentPopup(false)
        setGamePhase('scammed_display')
      }, 1500)
    }
  }, [paymentStep, randomScore])

  // ✅ Transition from reported step to score display  
  useEffect(() => {
    if (paymentStep === 'reported' && randomScore > 0) {
      setTimeout(() => {
        setShowPaymentPopup(false)
        setGamePhase('detected_display')
      }, 1500)
    }
  }, [paymentStep, randomScore])

  const handleFellForScam = () => {
    if (submitAction) submitAction('fell_for_scam')
    setScore(0)
    setTimeout(() => setGamePhase('results'), 500)
  }

  const handlePlayAgain = () => {
    window.location.href = `/play?room=${roomCode}`
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div style={{
            width: '64px', height: '64px', border: '4px solid rgba(255, 23, 68, 0.3)',
            borderTop: '4px solid var(--red)', borderRadius: '50%', animation: 'spin 1s linear infinite',
            marginBottom: '16px'
          }}></div>
          <p style={{ color: 'var(--text)', fontFamily: 'var(--font-body)', fontWeight: 600, textAlign: 'center' }}>Loading...</p>
        </motion.div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', maxWidth: '448px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-head)', fontWeight: 'bold', color: 'var(--red)', marginBottom: '16px' }}>
            Error Loading Chat
          </h1>
          <p style={{ color: 'var(--text)', marginBottom: '24px', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
            {loadError}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => {
              setLoadError(null)
              setIsLoading(true)
              fetchChatScenario()
            }}
            style={{
              background: 'var(--red)',
              color: 'white',
              fontFamily: 'var(--font-body)',
              fontWeight: 'bold',
              padding: '12px 24px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Retry Loading
          </motion.button>
        </motion.div>
      </div>
    )
  }

  if (gamePhase === 'chat' && scenario) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--dark)', padding: '32px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: '768px', margin: '0 auto 24px', width: '100%' }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: 'clamp(28px, 7vw, 48px)',
              fontFamily: 'var(--font-head)',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, var(--cyan), var(--red))',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px'
            }}>
              ROUND 2: CHAT SIMULATION
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '14px', fontFamily: 'var(--font-body)' }}>Can you spot the scam?</p>
          </motion.div>


        </div>

        <div style={{ maxWidth: '768px', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', width: '100%', gap: '16px' }}>
          <div style={{
            flex: 1,
            background: 'var(--card2)',
            borderRadius: '12px',
            overflow: 'hidden',
            border: `1px solid var(--border)`,
            boxShadow: '0 0 30px rgba(255, 23, 68, 0.2)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              background: 'var(--card)',
              borderBottom: `1px solid var(--border)`,
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  background: 'linear-gradient(to right, #ff6644, var(--red))'
                }}>
                  B
                </div>
                <div>
                  <h3 style={{ color: 'white', fontWeight: 600, fontSize: '14px', fontFamily: 'var(--font-body)', margin: 0 }}>
                    Bro
                  </h3>
                  <p style={{ color: 'var(--muted)', fontSize: '12px', fontFamily: 'var(--font-body)', margin: 0 }}>
                    Active
                  </p>
                </div>
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '20px' }}>⋮</div>
            </div>

            <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--dark)' }}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', justifyContent: msg.sender === 'SCAMMER' ? 'flex-start' : 'flex-end' }}
                >
                  <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    maxWidth: '70%',
                    wordWrap: 'break-word',
                    background: msg.sender === 'SCAMMER' ? 'rgba(255, 23, 68, 0.15)' : 'linear-gradient(to right, #00aa00, #00ff00)',
                    color: msg.sender === 'SCAMMER' ? 'var(--text)' : 'white',
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    lineHeight: 1.5
                  }}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {isWaitingForResponse && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', justifyContent: 'flex-start' }}
                >
                  <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'rgba(255, 23, 68, 0.15)', borderRadius: '8px' }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{
                        width: '8px',
                        height: '8px',
                        background: 'var(--red)',
                        borderRadius: '50%',
                        animation: 'bounce 1.4s infinite',
                        animationDelay: `${i * 0.2}s`
                      }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div style={{ background: 'var(--card)', borderTop: `1px solid var(--border)`, padding: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type here..."
                  autoFocus={true}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    fontSize: '16px',
                    fontFamily: 'Arial, sans-serif',
                    background: '#1a1a2e',
                    color: '#ffffff',
                    border: '2px solid #ff1744',
                    borderRadius: '8px',
                    outline: 'none',
                    pointerEvents: 'auto',  // 🔥 Explicit pointer events
                    zIndex: 100,  // 🔥 Ensure input is clickable
                    cursor: 'text',  // 🔥 Show text cursor
                    position: 'relative'  // 🔥 Create stacking context
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={isWaitingForResponse || !userInput.trim()}
                  style={{
                    background: 'var(--red)',
                    color: 'white',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 'bold',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: (isWaitingForResponse || !userInput.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (isWaitingForResponse || !userInput.trim()) ? 0.5 : 1,
                    pointerEvents: 'auto',  // 🔥 Ensure button is clickable
                    zIndex: 100,  // 🔥 Ensure button is above overlays
                    position: 'relative'  // 🔥 Create stacking context
                  }}
                >
                  Send
                </motion.button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', position: 'relative', zIndex: 100 }}>
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                console.log('✅ PAYMENT BUTTON - MOUSEDOWN')
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('✅ PAYMENT BUTTON CLICKED - setShowPaymentPopup(true)')
                setShowPaymentPopup(true)
              }}
              style={{
                background: 'linear-gradient(to right, #ff6644, #ff2244)',
                color: 'white',
                fontFamily: 'var(--font-body)',
                fontWeight: 'bold',
                padding: '16px 24px',
                borderRadius: '8px',
                border: '2px solid #ff1744',
                cursor: 'pointer',
                fontSize: '16px',
                boxShadow: '0 0 20px rgba(255, 23, 68, 0.4)',
                transition: 'all 0.3s',
                width: '100%',
                position: 'relative',
                zIndex: 100,
                pointerEvents: 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 23, 68, 0.8)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 23, 68, 0.4)'
              }}
            >
              💳 Open Payment Link
            </button>

            <button
              onMouseDown={(e) => {
                e.preventDefault()
                console.log('✅ DETECT SCAM BUTTON - MOUSEDOWN')
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('✅ DETECT SCAM BUTTON CLICKED - setShowReportPopup(true)')
                setShowReportPopup(true)
              }}
              style={{
                background: 'linear-gradient(to right, #00aa00, #00ff00)',
                color: '#000',
                fontFamily: 'var(--font-body)',
                fontWeight: 'bold',
                padding: '16px 24px',
                borderRadius: '8px',
                border: '2px solid #00ff00',
                cursor: 'pointer',
                fontSize: '16px',
                boxShadow: '0 0 20px rgba(0, 255, 0, 0.4)',
                transition: 'all 0.3s',
                width: '100%',
                position: 'relative',
                zIndex: 100,
                pointerEvents: 'auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.8)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.4)'
              }}
            >
              🛡️ Detect Scam
            </button>
          </div>

          <p style={{ color: 'var(--muted)', fontSize: '12px', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
            💡 A payment request has been sent. What will you do?
          </p>
        </div>

        <AnimatePresence>
          {showPaymentModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '16px'
              }}
              onClick={() => {
                console.log('Modal backdrop clicked')
                setShowPaymentModal(false)
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'var(--card2)',
                  borderRadius: '16px',
                  padding: '32px',
                  maxWidth: '500px',
                  width: '100%',
                  border: '2px solid var(--red)',
                  boxShadow: '0 20px 60px rgba(255, 23, 68, 0.3)'
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>💳</div>
                  <h2 style={{
                    fontSize: '28px',
                    fontFamily: 'var(--font-head)',
                    fontWeight: 'bold',
                    color: 'var(--red)',
                    marginBottom: '8px'
                  }}>
                    Payment Request
                  </h2>
                  <p style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
                    {scenario?.payment_block?.amount || '₹20,000'}
                  </p>
                </div>

                <div style={{
                  background: 'rgba(255, 23, 68, 0.08)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px',
                  border: '1px solid var(--border)'
                }}>
                  <p style={{
                    color: 'var(--text)',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    fontFamily: 'var(--font-body)',
                    margin: 0
                  }}>
                    A payment request for urgent help. This is your chance to decide: is this a real emergency or a scam?
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { 
                      console.log('📋 REPORT SCAM - Showing report popup')
                      setShowPaymentModal(false)
                      setShowReportPopup(true)
                    }}
                    style={{
                      background: 'linear-gradient(to right, #00aa00, #00ff00)',
                      color: '#000',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 'bold',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    🛡️ Report & Exit
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { 
                      console.log('💳 PAYMENT COMPLETED - Redirecting to main page')
                      if (submitAction) submitAction('fell_for_scam')
                      setPaymentClicked(true)
                      setShowPaymentModal(false)
                      setTimeout(() => {
                        window.location.href = '/'
                      }, 500)
                    }}
                    style={{
                      background: 'linear-gradient(to right, var(--red), var(--pink))',
                      color: 'white',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 'bold',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    💳 Pay Now
                  </motion.button>
                </div>

                <button
                  onClick={() => setShowPaymentModal(false)}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    background: 'transparent',
                    color: 'var(--muted)',
                    border: 'none',
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✕ Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 💰 Payment Detection Popup Modal - Multi-Step Flow */}
        {showPaymentPopup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(5px)',
            pointerEvents: 'auto'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2a1a1a 100%)',
              border: paymentStep === 'initial' ? '3px solid #ff1744' : paymentStep === 'successful' ? '3px solid #ffa500' : paymentStep === 'scammed' ? '3px solid #ff1744' : '3px solid #00e676',
              borderRadius: '12px',
              padding: '48px 40px',
              maxWidth: '500px',
              width: '90%',
              textAlign: 'center',
              boxShadow: paymentStep === 'initial' ? '0 0 40px rgba(255,23,68,0.5)' : paymentStep === 'successful' ? '0 0 40px rgba(255,165,0,0.5)' : paymentStep === 'scammed' ? '0 0 40px rgba(255,23,68,0.5)' : '0 0 40px rgba(0,230,118,0.5)',
              position: 'relative',
              zIndex: 10000,
              pointerEvents: 'auto'
            }}>
              {/* STEP 1: INITIAL - Payment Detection */}
              {paymentStep === 'initial' && (
                <>
                  <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'pulse 1s infinite' }}>💳</div>
                  <h2 style={{ fontSize: '32px', color: '#ff1744', marginBottom: '16px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Payment Detected!</h2>
                  <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', marginBottom: '32px', lineHeight: '1.6' }}>
                    The scammer is asking for payment! Do you want to make the payment?
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 10000 }}>
                    <button
                      onClick={handleMakePayment}
                      style={{
                        padding: '16px 32px',
                        background: 'linear-gradient(135deg, #ffa500, #ffb533)',
                        border: 'none',
                        color: '#000',
                        fontSize: '16px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        position: 'relative',
                        zIndex: 10000,
                        pointerEvents: 'auto'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)'
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(255,165,0,0.6)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      💰 Make Payment
                    </button>
                    <button
                      onClick={handleEndGame}
                      style={{
                        padding: '16px 32px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '2px solid rgba(255,255,255,0.3)',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        position: 'relative',
                        zIndex: 10000,
                        pointerEvents: 'auto'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)'
                        e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                      }}
                    >
                      ❌ Refuse Payment (End Game)
                    </button>
                  </div>
                  <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,23,68,0.1)', borderLeft: '4px solid #ff1744', borderRadius: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', textAlign: 'left' }}>
                    <strong>⚠️ Warning:</strong> Real scammers always try to get money. If you send payment, you lose!
                  </div>
                </>
              )}
              
              {/* STEP 2: SUCCESSFUL - Payment Successful */}
              {paymentStep === 'successful' && (
                <>
                  <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>✅</div>
                  <h2 style={{ fontSize: '32px', color: '#ffa500', marginBottom: '16px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Payment Successful!</h2>
                  <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', marginBottom: '32px', lineHeight: '1.6' }}>
                    Your payment has been processed. Processing your transaction...
                  </p>
                  <button
                    onClick={handlePaymentSuccessful}
                    style={{
                      padding: '16px 32px',
                      background: 'linear-gradient(135deg, #ffa500, #ffb533)',
                      border: 'none',
                      color: '#000',
                      fontSize: '16px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      position: 'relative',
                      zIndex: 10000,
                      pointerEvents: 'auto',
                      animation: 'pulse 1s infinite'
                    }}
                  >
                    ⏳ Continue...
                  </button>
                </>
              )}
              
              {/* STEP 3: SCAMMED - You Are Being Scammed */}
              {paymentStep === 'scammed' && (
                <>
                  <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'shake 0.5s infinite' }}>🚨</div>
                  <h2 style={{ fontSize: '32px', color: '#ff1744', marginBottom: '16px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>⚠️ YOU ARE BEING SCAMMED!</h2>
                  <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', marginBottom: '24px', lineHeight: '1.6' }}>
                    This is a SCAM! The caller is attempting to steal your money. You need to take immediate action!
                  </p>
                  <div style={{ padding: '16px', background: 'rgba(255,23,68,0.2)', borderLeft: '4px solid #ff1744', borderRadius: '4px', fontSize: '14px', color: 'rgba(255,200,200,1)', textAlign: 'left', marginBottom: '24px', fontWeight: 600 }}>
                    📋 Scam Details Detected:
                    <ul style={{ marginTop: '12px', paddingLeft: '20px' }}>
                      <li>💳 Requesting payment over phone</li>
                      <li>🎭 Impersonating official authority</li>
                      <li>⏰ Creating artificial urgency</li>
                      <li>🔒 Threatening account closure</li>
                    </ul>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 10000 }}>
                    <button
                      onClick={handleReport}
                      style={{
                        padding: '16px 32px',
                        background: 'linear-gradient(135deg, #ff6b6b, #ff1744)',
                        border: 'none',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        position: 'relative',
                        zIndex: 10000,
                        pointerEvents: 'auto'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)'
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(255,23,68,0.6)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      📞 Report to Authorities
                    </button>
                    <button
                      onClick={handleBlock}
                      style={{
                        padding: '16px 32px',
                        background: 'linear-gradient(135deg, #00e676, #00ff88)',
                        border: 'none',
                        color: '#000',
                        fontSize: '16px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        position: 'relative',
                        zIndex: 10000,
                        pointerEvents: 'auto'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)'
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(0,230,118,0.6)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      🚫 Block User
                    </button>
                  </div>
                </>
              )}
              
              {/* STEP 4: REPORTED - Report to Authorities */}
              {paymentStep === 'reported' && (
                <>
                  <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'pulse 1s infinite' }}>📞</div>
                  <h2 style={{ fontSize: '32px', color: '#00e676', marginBottom: '16px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>✅ Report Sent!</h2>
                  <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', marginBottom: '24px', lineHeight: '1.6' }}>
                    Thank you for reporting this scam to the authorities. The incident has been logged:
                  </p>
                  <div style={{ padding: '16px', background: 'rgba(0,230,118,0.1)', borderLeft: '4px solid #00e676', borderRadius: '4px', fontSize: '13px', color: 'rgba(200,255,200,1)', textAlign: 'left', marginBottom: '24px', fontWeight: 600 }}>
                    ✓ Report filed with National Fraud Bureau<br />✓ Case ID: #SCAM-2026-{Math.random().toString(36).substring(7).toUpperCase()}<br />✓ Status: Under Investigation<br />✓ The caller number has been blocked and reported
                  </div>
                  <button
                    onClick={handleEndPaymentFlow}
                    style={{
                      padding: '16px 32px',
                      background: 'linear-gradient(135deg, #00e676, #00ff88)',
                      border: 'none',
                      color: '#000',
                      fontSize: '16px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      width: '100%',
                      position: 'relative',
                      zIndex: 10000,
                      pointerEvents: 'auto'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)'
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(0,230,118,0.6)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    ✅ End Game
                  </button>
                </>
              )}
              
              {/* STEP 5: BLOCKED - User is Blocked */}
              {paymentStep === 'blocked' && (
                <>
                  <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'spin 2s linear infinite' }}>🚫</div>
                  <h2 style={{ fontSize: '32px', color: '#00e676', marginBottom: '16px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>✅ User Blocked!</h2>
                  <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', marginBottom: '24px', lineHeight: '1.6' }}>
                    The scammer has been successfully blocked from contacting you:
                  </p>
                  <div style={{ padding: '16px', background: 'rgba(0,230,118,0.1)', borderLeft: '4px solid #00e676', borderRadius: '4px', fontSize: '13px', color: 'rgba(200,255,200,1)', textAlign: 'left', marginBottom: '24px', fontWeight: 600 }}>
                    ✓ Phone number blocked<br />✓ Cannot call or text your device<br />✓ All incoming calls from this number rejected<br />✓ Number added to national scam registry
                  </div>
                  <button
                    onClick={handleEndPaymentFlow}
                    style={{
                      padding: '16px 32px',
                      background: 'linear-gradient(135deg, #00e676, #00ff88)',
                      border: 'none',
                      color: '#000',
                      fontSize: '16px',
                      fontWeight: 700,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      width: '100%',
                      position: 'relative',
                      zIndex: 10000,
                      pointerEvents: 'auto'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)'
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(0,230,118,0.6)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    ✅ End Game
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* 👤 Personal Message Popup Modal */}
        {showPersonalMsg && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            backdropFilter: 'blur(5px)',
            pointerEvents: 'auto'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #0a1a2e 0%, #16213e 100%)',
              border: '3px solid #00e676',
              borderRadius: '12px',
              padding: '48px 40px',
              maxWidth: '500px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 0 40px rgba(0,230,118,0.5)',
              position: 'relative',
              zIndex: 10001,
              pointerEvents: 'auto'
            }}>
              <div style={{ fontSize: '60px', marginBottom: '24px' }}>
                {personalMsgAction === 'end' ? '🛑' : '❌'}
              </div>
              <h2 style={{ fontSize: '28px', color: '#00e676', marginBottom: '16px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
                {personalMsgAction === 'end' ? 'Game Over' : 'Confirm'}
              </h2>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', marginBottom: '32px', lineHeight: '1.8', fontStyle: 'italic' }}>
                {personalMsgAction === 'end' 
                  ? '"You gave your payment details to a scammer. Remember: legitimate companies never ask for payment over the phone. Stay safe!"'
                  : '"Keep questioning the caller. Look for red flags: urgency, threats, and requests for money. You\'re doing great!"'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 10001 }}>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('✅ CONFIRM BUTTON CLICKED')
                    if (personalMsgAction === 'end') {
                      confirmEndGame()
                    } else {
                      confirmContinue()
                    }
                  }}
                  style={{
                    padding: '14px 32px',
                    background: personalMsgAction === 'end' 
                      ? 'linear-gradient(135deg, #ff1744, #ff5577)' 
                      : 'linear-gradient(135deg, #00e676, #00ff88)',
                    border: 'none',
                    color: personalMsgAction === 'end' ? '#fff' : '#000',
                    fontSize: '14px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    position: 'relative',
                    zIndex: 10001,
                    pointerEvents: 'auto'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.boxShadow = personalMsgAction === 'end'
                      ? '0 0 20px rgba(255,23,68,0.6)'
                      : '0 0 20px rgba(0,230,118,0.6)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {personalMsgAction === 'end' ? '🛑 Accept Loss' : '✅ Continue Playing'}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('← GO BACK CLICKED')
                    setShowPersonalMsg(false)
                    if (personalMsgAction === 'end') {
                      setShowPaymentPopup(true)
                    }
                  }}
                  style={{
                    padding: '14px 32px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    position: 'relative',
                    zIndex: 10001,
                    pointerEvents: 'auto'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  }}
                >
                  ← Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 📋 Report Confirmation Popup */}
        {showReportPopup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10002,
            backdropFilter: 'blur(5px)',
            pointerEvents: 'auto'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a3a1a 0%, #2a4a2a 100%)',
              border: '3px solid #00e676',
              borderRadius: '12px',
              padding: '48px 40px',
              maxWidth: '500px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 0 40px rgba(0,230,118,0.5)',
              position: 'relative',
              zIndex: 10002,
              pointerEvents: 'auto'
            }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>📋</div>
              <h2 style={{ fontSize: '32px', color: '#00e676', marginBottom: '16px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
                Report Sent!
              </h2>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', marginBottom: '32px', lineHeight: '1.6' }}>
                Thank you for reporting this scam. Your report helps protect others.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 10002 }}>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('✅ END GAME AFTER REPORT')
                    setShowReportPopup(false)
                    if (submitAction) submitAction('detected_scam')
                    setGamePhase('game_finished')
                    setTimeout(() => {
                      console.log('🔄 Redirecting to main page after report with game_finished status...')
                      window.location.href = '/?status=game_finished'
                    }, 2000)
                  }}
                  style={{
                    padding: '14px 32px',
                    background: 'linear-gradient(135deg, #00e676, #00ff88)',
                    border: 'none',
                    color: '#000',
                    fontSize: '14px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    position: 'relative',
                    zIndex: 10002,
                    pointerEvents: 'auto'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0,230,118,0.6)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  ✅ Finish Game
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('← GO BACK FROM REPORT')
                    setShowReportPopup(false)
                  }}
                  style={{
                    padding: '14px 32px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    position: 'relative',
                    zIndex: 10002,
                    pointerEvents: 'auto'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  }}
                >
                  ← Go Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (gamePhase === 'payment_cleared') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', maxWidth: '500px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>💸</div>
          
          <h1 style={{
            fontSize: 'clamp(24px, 8vw, 36px)',
            fontFamily: 'var(--font-head)',
            fontWeight: 'bold',
            marginBottom: '16px',
            color: 'var(--red)'
          }}>
            Your Bank Account Has Been Cleared!
          </h1>

          <p style={{
            fontSize: '18px',
            color: 'var(--text)',
            fontFamily: 'var(--font-body)',
            marginBottom: '32px',
            lineHeight: '1.6'
          }}>
            All your money has been transferred. This was a scam...
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setGamePhase('congratulations')}
            style={{
              background: 'linear-gradient(to right, #00aa00, #00ff00)',
              color: 'white',
              fontFamily: 'var(--font-body)',
              fontWeight: 'bold',
              padding: '16px 48px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              boxShadow: '0 0 20px rgba(0, 255, 0, 0.4)'
            }}
          >
            🛡️ Detect Scam
          </motion.button>
        </motion.div>
      </div>
    )
  }

  if (gamePhase === 'congratulations') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{ fontSize: '64px', marginBottom: '24px' }}
          >
            🎉
          </motion.div>
          
          <h1 style={{
            fontSize: 'clamp(28px, 8vw, 40px)',
            fontFamily: 'var(--font-head)',
            fontWeight: 'bold',
            marginBottom: '16px',
            background: 'linear-gradient(to right, #00ff00, var(--cyan))',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Congratulations!
          </h1>

          <p style={{
            fontSize: '20px',
            color: 'var(--text)',
            fontFamily: 'var(--font-body)',
            marginBottom: '24px',
            lineHeight: '1.6'
          }}>
            You now know about the scam! This knowledge is your best defense against fraudsters.
          </p>

          <div style={{
            background: 'rgba(0, 255, 0, 0.1)',
            border: '2px solid #00ff00',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px'
          }}>
            <p style={{
              fontSize: '16px',
              color: '#00ff00',
              fontFamily: 'var(--font-body)',
              margin: 0,
              lineHeight: '1.6'
            }}>
              ✅ You learned to identify suspicious behavior<br/>
              ✅ You recognized the emotional manipulation<br/>
              ✅ You understand how scammers operate
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = `/play?room=${roomCode}`}
            style={{
              background: 'linear-gradient(to right, var(--cyan), #0099ff)',
              color: 'white',
              fontFamily: 'var(--font-body)',
              fontWeight: 'bold',
              padding: '16px 48px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)'
            }}
          >
            Next Round
          </motion.button>
        </motion.div>
      </div>
    )
  }

  if (gamePhase === 'game_finished') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', maxWidth: '500px' }}>
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ fontSize: '80px', marginBottom: '24px' }}
          >
            ✅
          </motion.div>
          
          <h1 style={{
            fontSize: 'clamp(28px, 8vw, 40px)',
            fontFamily: 'var(--font-head)',
            fontWeight: 'bold',
            marginBottom: '16px',
            background: 'linear-gradient(to right, #00e676, #00ff88)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Game Finished!
          </h1>

          <p style={{
            fontSize: '18px',
            color: 'var(--text)',
            fontFamily: 'var(--font-body)',
            marginBottom: '24px',
            lineHeight: '1.6'
          }}>
            You successfully reported the scam and protected yourself!
          </p>

          <div style={{
            background: 'rgba(0, 230, 118, 0.1)',
            border: '2px solid #00e676',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px'
          }}>
            <p style={{
              fontSize: '16px',
              color: '#00e676',
              fontFamily: 'var(--font-body)',
              margin: 0,
              lineHeight: '1.6'
            }}>
              🛡️ You detected the scam<br/>
              📋 You reported it<br/>
              ✨ You stayed safe!
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = '/'}
            style={{
              background: 'linear-gradient(to right, #00e676, #00ff88)',
              color: '#000',
              fontFamily: 'var(--font-body)',
              fontWeight: 'bold',
              padding: '16px 48px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              boxShadow: '0 0 20px rgba(0, 230, 118, 0.4)'
            }}
          >
            Back to Home
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // 🔴 SCAMMED DISPLAY - Show random score after payment successful
  if (gamePhase === 'scammed_display' && randomScore > 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflow: 'auto' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '20px' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            {/* 🔴 SCAMMED ALERT */}
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ fontSize: '100px', marginBottom: '24px' }}
            >
              😱
            </motion.div>

            <h1 style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#ff1744',
              marginBottom: '16px',
              letterSpacing: '2px',
              textTransform: 'uppercase'
            }}>
              YOU GOT SCAMMED!
            </h1>

            <p style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '40px',
              lineHeight: '1.6'
            }}>
              You fell for the fraud attempt and sent money
            </p>

            {/* 📊 RANDOM SCORE DISPLAY */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                background: 'rgba(255,23,68,0.15)',
                border: '2px solid #ff1744',
                borderRadius: '16px',
                padding: '40px',
                marginBottom: '32px'
              }}
            >
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', letterSpacing: '2px' }}>
                YOUR ROUND 2 SCORE
              </div>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{
                  fontSize: '72px',
                  fontWeight: 800,
                  color: randomScore > 70 ? '#00ff88' : randomScore > 40 ? '#ffb700' : '#ff1744',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {randomScore}
              </motion.div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '12px' }}>
                Out of 100
              </div>
            </motion.div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            </div>

            {/* END GAME BUTTON */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                console.log('✅ SCAMMED BUTTON CLICKED')
                if (submitAction) submitAction('fell_for_scam')
                setScore(randomScore)
              }}
              style={{
                width: '100%',
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #00e5ff, #00d4ff)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                zIndex: 50,
                position: 'relative'
              }}
            >
              BACK TO HOME
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ✅ DETECTED DISPLAY - Show random score after detecting scam
  if (gamePhase === 'detected_display' && randomScore > 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflow: 'auto' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '20px' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            {/* ✅ SUCCESS ALERT */}
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ fontSize: '100px', marginBottom: '24px' }}
            >
              🎯
            </motion.div>

            <h1 style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#00ff88',
              marginBottom: '16px',
              letterSpacing: '2px',
              textTransform: 'uppercase'
            }}>
              SCAM DETECTED!
            </h1>

            <p style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '40px',
              lineHeight: '1.6'
            }}>
              You successfully identified and reported the fraud
            </p>

            {/* 📊 RANDOM SCORE DISPLAY */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                background: 'rgba(0,170,0,0.15)',
                border: '2px solid #00ff88',
                borderRadius: '16px',
                padding: '40px',
                marginBottom: '32px'
              }}
            >
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', letterSpacing: '2px' }}>
                YOUR ROUND 2 SCORE
              </div>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{
                  fontSize: '72px',
                  fontWeight: 800,
                  color: '#00ff88',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {randomScore}
              </motion.div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '12px' }}>
                Out of 100
              </div>
            </motion.div>

            {/* STATUS INDICATORS */}
            {paymentStep === 'reported' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'rgba(0,170,0,0.2)',
                  border: '1px solid #00ff88',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '24px'
                }}
              >
                <div style={{ color: '#00ff88', fontSize: '14px', fontWeight: 700 }}>
                  ✅ Reported to Authorities
                </div>
              </motion.div>
            )}

            {paymentStep === 'blocked' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'rgba(255,23,68,0.2)',
                  border: '1px solid #ff1744',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '24px'
                }}
              >
                <div style={{ color: '#ff1744', fontSize: '14px', fontWeight: 700 }}>
                  🚫 Scammer Blocked
                </div>
              </motion.div>
            )}

            {/* ACTION BUTTONS - Report & Block */}
            {paymentStep !== 'reported' && paymentStep !== 'blocked' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', position: 'relative', zIndex: 50 }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setPaymentStep('reported')
                  }}
                  style={{
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, #00aa00, #00ff00)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    zIndex: 50,
                    position: 'relative'
                  }}
                >
                  📋 Report
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setPaymentStep('blocked')
                  }}
                  style={{
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, #ff1744, #ff5577)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    zIndex: 50,
                    position: 'relative'
                  }}
                >
                  🚫 Block
                </motion.button>
              </div>
            )}

            {/* END GAME BUTTON */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                console.log('✅ DETECTED BUTTON CLICKED')
                if (submitAction) submitAction('detected_scam')
                setScore(randomScore)
              }}
              style={{
                width: '100%',
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #00ff88, #00ffaa)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                zIndex: 50,
                position: 'relative'
              }}
            >
              BACK TO HOME
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (gamePhase === 'results') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>{score === 100 ? '✅' : '❌'}</div>
          
          <h1 style={{
            fontSize: 'clamp(24px, 8vw, 36px)',
            fontFamily: 'var(--font-head)',
            fontWeight: 'bold',
            marginBottom: '16px',
            color: score === 100 ? '#00ff00' : 'var(--red)'
          }}>
            {score === 100 ? 'You Spotted It!' : 'That Was a Scam'}
          </h1>

          <div style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: 'var(--cyan)',
            marginBottom: '32px',
            fontFamily: 'var(--font-head)'
          }}>
            +{score} points
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayAgain}
            style={{
              background: 'linear-gradient(to right, var(--red), var(--pink))',
              color: 'white',
              fontFamily: 'var(--font-body)',
              fontWeight: 'bold',
              padding: '16px 32px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              boxShadow: '0 0 20px rgba(255, 23, 68, 0.4)'
            }}
          >
            Play Again
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // 🔴 DEBUG FALLBACK - Show what's happening if no phase matches
  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ textAlign: 'center', maxWidth: '600px', background: 'rgba(0,0,0,0.5)', padding: '40px', borderRadius: '12px', border: '2px solid #ff1744' }}>
        <h1 style={{ color: '#ff1744', fontSize: '24px', marginBottom: '16px' }}>⚠️ DEBUG: Phase Not Recognized</h1>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', textAlign: 'left', fontFamily: 'monospace', lineHeight: '1.8' }}>
          <div>📊 Current State:</div>
          <div>• gamePhase: {gamePhase}</div>
          <div>• randomScore: {randomScore}</div>
          <div>• paymentStep: {paymentStep}</div>
          <div>• messages.length: {messages.length}</div>
          <div style={{ marginTop: '16px', color: '#ffb700' }}>
            {gamePhase === 'scammed_display' && randomScore === 0 && '❌ Score is 0, should be > 0'}
            {gamePhase === 'detected_display' && randomScore === 0 && '❌ Score is 0, should be > 0'}
            {gamePhase === 'chat' && '❌ Still in chat phase'}
            {gamePhase === 'loading' && '⏳ Still loading'}
          </div>
        </div>
        <button onClick={() => window.location.href = '/'} style={{ marginTop: '20px', padding: '12px 24px', background: '#ff1744', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Return Home
        </button>
      </div>
    </div>
  )
}

