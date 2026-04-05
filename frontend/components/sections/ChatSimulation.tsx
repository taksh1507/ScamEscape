'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  const [gamePhase, setGamePhase] = useState<'loading' | 'chat' | 'results' | 'payment_cleared' | 'congratulations'>('loading')
  const [userInput, setUserInput] = useState('')
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [scamType, setScamType] = useState<'relative_emergency' | 'cybersecurity'>('relative_emergency')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentClicked, setPaymentClicked] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useAutoScroll(messages)

  const handleMessage = useCallback((evt: any) => {
    console.log('ChatSimulation received event:', evt)
  }, [])

  const { submitAction } = useGameSocket(roomCode, playerId, handleMessage)

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
        
        const response = await fetch(url)
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
          
          // 🔥 Handle rate limit errors with exponential backoff
          if (response.status === 429 && retryCount < maxRetries) {
            const delayMs = Math.pow(2, retryCount) * 1000 + Math.random() * 1000 // 1s, 2s, 4s + jitter
            console.log(`⏳ Rate limited! Retrying in ${delayMs.toFixed(0)}ms...`)
            setLoadError(`Rate limited by API. Retrying in ${(delayMs / 1000).toFixed(1)}s...`)
            
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
            scam_type: scamType
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
  }, [userInput, messages, isWaitingForResponse, scamType])

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleDetectScam = () => {
    if (submitAction) submitAction('detected_scam')
    setScore(100)
    setTimeout(() => setGamePhase('results'), 500)
  }

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
            Error
          </h1>
          <p style={{ color: 'var(--text)', marginBottom: '24px', fontFamily: 'var(--font-body)' }}>
            {loadError}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--red)',
              color: 'white',
              fontFamily: 'var(--font-body)',
              fontWeight: 'bold',
              padding: '12px 24px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Retry
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

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setScamType('relative_emergency')}
              style={{
                padding: '8px 24px',
                borderRadius: '6px',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                cursor: 'pointer',
                background: scamType === 'relative_emergency' ? 'linear-gradient(to right, #ff6644, #ff2244)' : 'rgba(255, 23, 68, 0.1)',
                color: scamType === 'relative_emergency' ? 'white' : 'var(--text)',
                border: scamType === 'relative_emergency' ? 'none' : '1px solid var(--border)'
              }}
            >
              👨‍👩‍👧 Relative Emergency
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setScamType('cybersecurity')}
              style={{
                padding: '8px 24px',
                borderRadius: '6px',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                cursor: 'pointer',
                background: scamType === 'cybersecurity' ? 'linear-gradient(to right, #00dddd, #0099ff)' : 'rgba(0, 229, 255, 0.1)',
                color: scamType === 'cybersecurity' ? 'white' : 'var(--text)',
                border: scamType === 'cybersecurity' ? 'none' : '1px solid var(--border)'
              }}
            >
              🔐 Cybersecurity Alert
            </motion.button>
          </div>
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
                  background: scamType === 'cybersecurity' ? 'linear-gradient(to right, var(--cyan), #0099ff)' : 'linear-gradient(to right, #ff6644, var(--red))'
                }}>
                  {scamType === 'cybersecurity' ? '🔐' : 'B'}
                </div>
                <div>
                  <h3 style={{ color: 'white', fontWeight: 600, fontSize: '14px', fontFamily: 'var(--font-body)', margin: 0 }}>
                    {scamType === 'cybersecurity' ? 'Security Alert' : 'Bro'}
                  </h3>
                  <p style={{ color: 'var(--muted)', fontSize: '12px', fontFamily: 'var(--font-body)', margin: 0 }}>
                    {scamType === 'cybersecurity' ? 'Bank Support' : 'Active'}
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
                    outline: 'none'
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
                    opacity: (isWaitingForResponse || !userInput.trim()) ? 0.5 : 1
                  }}
                >
                  Send
                </motion.button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                console.log('Opening payment modal...')
                setShowPaymentModal(true)
              }}
              style={{
                background: 'linear-gradient(to right, #ff6644, #ff2244)',
                color: 'white',
                fontFamily: 'var(--font-body)',
                fontWeight: 'bold',
                padding: '16px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                boxShadow: '0 0 20px rgba(255, 23, 68, 0.4)'
              }}
            >
              💳 Open Payment Link
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                console.log('Detect Scam clicked')
                handleDetectScam()
              }}
              style={{
                background: 'linear-gradient(to right, #00aa00, #00ff00)',
                color: 'white',
                fontFamily: 'var(--font-body)',
                fontWeight: 'bold',
                padding: '16px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                boxShadow: '0 0 20px rgba(0, 255, 0, 0.4)'
              }}
            >
              🛡️ Detect Scam
            </motion.button>
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
                      handleDetectScam()
                      setShowPaymentModal(false)
                    }}
                    style={{
                      background: 'linear-gradient(to right, #00aa00, #00ff00)',
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
                    🛡️ It's a Scam!
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { 
                      setPaymentClicked(true)
                      setShowPaymentModal(false)
                      setGamePhase('payment_cleared')
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
}
