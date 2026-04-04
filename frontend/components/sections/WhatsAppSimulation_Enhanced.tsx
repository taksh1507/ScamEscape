'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRound2Socket, Round2Event, ScammerProfile } from '@/hooks/useRound2Socket'
import { useToast } from '@/hooks/useToast'
import { Send, XCircle, Shield, Flag, AlertCircle } from 'lucide-react'

interface Props {
  roomCode: string | null
  playerId: string | null
}

interface Message {
  id: string
  text: string
  isOwn: boolean
  time: Date
  type?: 'text' | 'action' | 'link'
  links?: Array<{id: string; url: string; label: string}>
}

export default function WhatsAppSimulationEnhanced({ roomCode, playerId }: Props) {
  const router = useRouter()
  const { toast, show: showToast } = useToast()
  
  const [gameState, setGameState] = useState<'loading' | 'active' | 'ended'>('loading')
  const [messages, setMessages] = useState<Message[]>([])
  const [scammer, setScammer] = useState<ScammerProfile | null>(null)
  const [userInput, setUserInput] = useState('')
  const [isWaiting, setIsWaiting] = useState(false)
  const [isShowingTyping, setIsShowingTyping] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [results, setResults] = useState<any>(null)
  const [roundScore, setRoundScore] = useState(0)
  const [modalAction, setModalAction] = useState<{type: 'block' | 'report' | null}>({type: null})
  const [showConfirmation, setShowConfirmation] = useState<{show: boolean; action: string}>({show: false, action: ''})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageQueueRef = useRef<Array<{text: string; delay: number}>>([])
  const processingRef = useRef(false)
  
  const { connected, send, startGame } = useRound2Socket(roomCode, playerId, (evt: Round2Event) => {
    if (evt.event === 'round2_start') {
      setScammer(evt.scammer)
      setGameState('active')
      
      // 🔥 Dynamic emergency opening messages based on scammer type
      const dynamicOpenings: {[key: string]: string[]} = {
        'relative_contact': [
          'Bhai please I need urgent help! I\'m in big trouble',
          'Hey it\'s me, don\'t tell mom and dad. I need money NOW please',
          'Sister I made a mistake, need ₹50000 urgent transfer please!!!',
          'Mom is asking me to ask you - we need money for hospital emergency',
          'Uncle i got arrested, father said contact you for bail money',
          'Cousin I\'m stuck at airport with no money, please transfer fast',
        ],
        'friend_contact': [
          'Hey buddy, emergency! Need money asap from you',
          'Man I\'m in serious trouble, can you help with urgent cash transfer?',
          'Dude I\'m stuck, my wallet got stolen. Can you send me money?',
          'Bro this is urgent, I need help NOW. Please transfer money',
        ],
        'bank_agent': [
          'Security Alert: Unauthorized activity detected on your account!',
          'URGENT: Fraud detected! Verify your account immediately',
          'Your account is at risk! Click to secure it now',
        ],
        'delivery_company': [
          'Package couldn\'t deliver - pay ₹499 to claim it before it returns',
          'Your delivery requires additional payment to proceed',
        ]
      }
      
      const scammerType = evt.scammer.type || 'relative_contact'
      const openings = dynamicOpenings[scammerType] || dynamicOpenings['relative_contact']
      const welcomeMsg = openings[Math.floor(Math.random() * openings.length)]
      
      setMessages([{
        id: '0',
        text: welcomeMsg,
        isOwn: false,
        type: 'text',
        time: new Date()
      }])
    } else if (evt.event === 'new_message') {
      // 🔥 Handle typing delay from server
      const typingDelay = evt.message.typing_delay_ms || 1000
      
      // Queue the message for delayed display
      messageQueueRef.current.push({
        text: evt.message.content,
        delay: typingDelay
      })
      
      // Process message queue
      processMessageQueue()
    } else if (evt.event === 'action_processed') {
      // 🔥 Log action processing
      console.log('📥 [ACTION PROCESSED] Backend response:', evt)
      
      // Handle continuing actions (block, report) with scoring
      setIsWaiting(false)  // 🔥 Clear waiting flag so buttons work again
      const actionEvt = evt as any
      
      // 🔥 Update round score if points awarded
      if (actionEvt.points_awarded) {
        console.log(`➕ [SCORE UPDATE] +${actionEvt.points_awarded} points awarded`)
        setRoundScore(prev => prev + actionEvt.points_awarded)
      }
      
      if (actionEvt.continue_game) {
        console.log('▶️ [GAME CONTINUE] Game continues with AI follow-up')
        // Display AI follow-up message to continue the game
        if (actionEvt.ai_response) {
          const aiMsg = actionEvt.ai_response.message || actionEvt.ai_response
          const delay = actionEvt.ai_response.typing_delay_ms || 1500
          messageQueueRef.current.push({
            text: aiMsg,
            delay: delay
          })
          setIsShowingTyping(false)
          // Use setTimeout to ensure state updates are processed
          setTimeout(() => processMessageQueue(), 100)
        }
      } else if (actionEvt.game_result) {
        // Game ends with final results (click_link or other ending actions)
        console.log('🏁 [GAME ENDED] Final results received:', actionEvt.game_result)
        setResults(actionEvt.game_result)
        setGameState('ended')
      }
    } else if (evt.event === 'error') {
      console.error('❌ [WEBSOCKET ERROR] Error event received:', evt)
      showToast('ERROR', (evt as any).message)
    }
  })

  // 🔥 MESSAGE QUEUE PROCESSOR: Shows typing indicator, then displays message with delay
  const processMessageQueue = useCallback(async () => {
    if (processingRef.current || messageQueueRef.current.length === 0) return
    
    processingRef.current = true
    const message = messageQueueRef.current.shift()
    
    if (!message) {
      processingRef.current = false
      return
    }
    
    // Show typing indicator
    setIsShowingTyping(true)
    
    // Wait for typing delay to simulate realistic typing
    await new Promise(resolve => setTimeout(resolve, message.delay))
    
    // Add AI message to chat
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      text: message.text,
      isOwn: false,
      type: 'text',
      time: new Date()
    }])
    
    // Hide typing and allow user input
    setIsShowingTyping(false)
    setIsWaiting(false)
    
    processingRef.current = false
    
    // Process next message if queued
    if (messageQueueRef.current.length > 0) {
      processMessageQueue()
    }
  }, [])

  const handleSendMessage = useCallback(async () => {
    if (!userInput.trim() || isWaiting || !connected) return

    const userMsg = userInput.trim()
    
    // Add user message to UI immediately
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      text: userMsg,
      isOwn: true,
      type: 'text',
      time: new Date()
    }])
    
    setUserInput('')
    setIsWaiting(true)

    // Send to backend
    send({
      event: 'player_message',
      message: userMsg
    })
  }, [userInput, isWaiting, connected, send])

  const handleAction = (action: string) => {
    if (isWaiting || isShowingTyping) return
    
    // 🔥 Open modal for Block and Report actions
    if (action === 'block' || action === 'report') {
      setModalAction({ type: action as 'block' | 'report' })
      return
    }
    
    // For other actions (verify), proceed directly
    handleConfirmAction(action, true)
  }

  const handleConfirmAction = (action: string, confirmed: boolean) => {
    if (isWaiting || isShowingTyping) return
    
    // Close modal
    setModalAction({ type: null })
    
    // If user chose not to confirm (block/report), don't do anything
    if (!confirmed && (action === 'block' || action === 'report')) {
      return
    }
    
    setIsWaiting(true)
    
    // 🔥 Show confirmation screen with scammer type info
    setShowConfirmation({ show: true, action: action })
    
    // Add action message to chat
    const actionMessages: {[key: string]: string} = {
      'verify': '🔍 Calling to verify...',
      'block': '🚫 Blocked this contact',
      'report': '🚨 Reported as scam',
    }
    
    const message = actionMessages[action] || 'Action taken'
    
    setMessages(prev => [...prev, {
      id: `action-${Date.now()}`,
      text: message,
      isOwn: true,
      type: 'action',
      time: new Date()
    }])
    
    // Engaging cyber-crime awareness tips with 2 lines each
    const engagingTips = {
      'block': {
        title: '✅ GREAT DEFENSIVE MOVE!',
        primary: 'Scammers often use multiple accounts. Blocking one stops this contact.',
        secondary: '🛡️ Pro Tip: Block → Tell your friends → Stay alert for new numbers!'
      },
      'report': {
        title: '🚨 YOU\'RE A CYBER WARRIOR!',
        primary: 'Your instant report triggers investigation by Cyber Crime Police.',
        secondary: '👮 Impact: Your 1 report stops 1000+ potential victims from getting scammed!'
      },
      'verify': {
        title: '✅ GOOD INSTINCT!',
        primary: 'Always verify before sharing any information with unknown sources.',
        secondary: '💡 Remember: Call official numbers directly from bank website, never use provided links!'
      }
    }
    
    // Show engaging toast notification
    const tipData = engagingTips[action as keyof typeof engagingTips]
    if (tipData) {
      showToast(tipData.title, `${tipData.primary}\n${tipData.secondary}`)
    }
    
    // Send action to backend to record score
    send({
      event: 'player_action',
      action: action
    })
  }

  const handleClearChat = () => {
    if (scammer) {
      setMessages([{
        id: '0',
        text: `Hi! I'm ${scammer.name}. Check out this amazing offer just for you!`,
        isOwn: false,
        type: 'text',
        time: new Date()
      }])
      showToast('INFO', 'Chat cleared')
    }
  }

  const handleLinkClick = (linkLabel: string) => {
    // 🔥 Disable all interactions immediately
    setIsWaiting(true)
    
    // 🔥 Log link click for debugging
    console.log('🚨 [LINK CLICK] User clicked malicious link:', {
      linkLabel,
      timestamp: new Date().toISOString(),
      playerID: playerId,
      roomCode: roomCode,
      connected: connected
    })

    // User clicked a malicious link - GAME OVER
    setMessages(prev => [...prev, {
      id: `click-${Date.now()}`,
      text: `🚨 You clicked the link: "${linkLabel}"`,
      isOwn: true,
      type: 'action',
      time: new Date()
    }])
    
    // Add scam notification
    setMessages(prev => [...prev, {
      id: `scam-${Date.now()}`,
      text: '⚠️ MALICIOUS LINK DETECTED! Your credentials were compromised!',
      isOwn: false,
      type: 'action',
      time: new Date()
    }])
    
    // 🔥 Show visible popup notification
    showToast('⚠️ MALICIOUS LINK DETECTED!', 'Your credentials were compromised! The scammer now has your information.')
    
    // 🔥 Send click_link action to backend with detailed logging
    const payload = {
      event: 'player_action',
      action: 'click_link'
    }
    
    console.log('📤 [BACKEND REQUEST] Sending click_link action:', payload)
    
    // Send with error handling
    try {
      send(payload)
      console.log('✅ [BACKEND SUCCESS] click_link action sent successfully')
    } catch (error) {
      console.error('❌ [BACKEND ERROR] Failed to send click_link action:', error)
      setIsWaiting(false)  // Re-enable if send fails
    }
  }

  useEffect(() => {
    if (connected && gameState === 'loading') {
      console.log('WebSocket connected, starting game now...')
      startGame()
    }
  }, [connected, gameState, startGame])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isShowingTyping])

  if (gameState === 'loading') {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--red), rgba(255,23,68,0.5))',
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>💬</div>
          <div style={{
            animation: 'spin 1s linear infinite',
            width: '48px',
            height: '48px',
            border: '4px solid #fff',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            margin: '0 auto 16px',
          }}></div>
          <p style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Loading AI Chatbot...</p>
        </div>
      </div>
    )
  }

  if (gameState === 'ended' && results) {
    const round1Score = results.round1_score || 0
    const round2Score = results.total_score || 0
    const finalScore = round1Score + round2Score
    const won = results.won

    return (
      <div style={{
        width: '100%',
        height: '100vh',
        background: 'var(--dark)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '700px' }}>
          <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'bounce 0.6s' }}>
            {won ? '🎉' : '💀'}
          </div>
          <h2 style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 'bold',
            marginBottom: '32px',
            fontFamily: 'var(--font-head)',
            letterSpacing: '2px',
            color: won ? 'var(--cyan)' : 'var(--red)',
          }}>
            {won ? 'YOU SURVIVED!' : 'YOU GOT SCAMMED!'}
          </h2>

          {/* Score Breakdown */}
          <div style={{
            background: 'var(--card)',
            padding: '32px',
            borderRadius: '8px',
            marginBottom: '32px',
            border: `2px solid ${won ? 'var(--cyan)' : 'var(--red)'}`,
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', color: 'var(--cyan)' }}>
              SCORE BREAKDOWN
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div style={{
                background: 'rgba(0,229,255,0.1)',
                padding: '16px',
                borderRadius: '6px',
                border: '1px solid rgba(0,229,255,0.3)',
              }}>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  ROUND 1 CALL
                </p>
                <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: 'var(--cyan)' }}>
                  {round1Score}
                </p>
              </div>
              
              <div style={{
                background: 'rgba(255,23,68,0.1)',
                padding: '16px',
                borderRadius: '6px',
                border: '1px solid rgba(255,23,68,0.3)',
              }}>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  ROUND 2 CHAT
                </p>
                <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: 'var(--red)' }}>
                  {round2Score}
                </p>
              </div>
            </div>

            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '16px',
              marginTop: '16px',
            }}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                FINAL SCORE
              </p>
              <p style={{ margin: 0, fontSize: '48px', fontWeight: 'bold', color: won ? 'var(--cyan)' : 'var(--red)' }}>
                {finalScore} pts
              </p>
            </div>
          </div>

          {/* Message */}
          <div style={{
            background: 'rgba(255,23,68,0.1)',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '32px',
            borderLeft: `4px solid ${won ? 'var(--cyan)' : 'var(--red)'}`,
          }}>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
              {results.tip || (won 
                ? '🔍 Great job! You detected the scam before it was too late.' 
                : '⚠️ You clicked a malicious link. Always verify contacts before clicking links!'
              )}
            </p>
          </div>

          <button
            onClick={() => router.push('/result')}
            style={{
              background: 'var(--red)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              padding: '16px 40px',
              cursor: 'pointer',
              fontSize: '14px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
              boxShadow: '0 0 30px rgba(255,23,68,0.4)',
              transition: 'all 0.3s',
            }}
            onMouseEnter={e => { (e.currentTarget as any).style.background = '#ff5577'; (e.currentTarget as any).style.boxShadow = '0 0 40px rgba(255,23,68,0.6)'; }}
            onMouseLeave={e => { (e.currentTarget as any).style.background = 'var(--red)'; (e.currentTarget as any).style.boxShadow = '0 0 30px rgba(255,23,68,0.4)'; }}
          >
            VIEW LEADERBOARD →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: 'var(--dark)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {/* 🔥 Header - Premium Style */}
      <div style={{
        background: 'var(--card)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(255,23,68,0.1)',
            border: '2px solid var(--red)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {scammer?.profile_picture ? (
              <img src={scammer.profile_picture} alt={scammer?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '20px' }}>👤</span>
            )}
          </div>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '1px',
              margin: 0,
            }}>{scammer?.name}</h3>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--cyan)',
              letterSpacing: '1px',
              margin: '4px 0 0',
            }}>● ONLINE</p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{
            background: 'rgba(0,229,255,0.1)',
            border: '1px solid rgba(0,229,255,0.2)',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--cyan)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            transition: 'all 0.3s',
          }} disabled={isWaiting || isShowingTyping} onClick={() => handleAction('verify')} onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(0,229,255,0.2)'; }} onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(0,229,255,0.1)'; }}>
            <Shield size={16} /> VERIFY
          </button>
          <button style={{
            background: 'rgba(255,23,68,0.1)',
            border: '1px solid rgba(255,23,68,0.2)',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--red)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            transition: 'all 0.3s',
          }} disabled={isWaiting || isShowingTyping} onClick={() => handleAction('block')} onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(255,23,68,0.2)'; }} onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(255,23,68,0.1)'; }}>
            <XCircle size={16} /> BLOCK
          </button>
          <button style={{
            background: 'rgba(255,23,68,0.1)',
            border: '1px solid rgba(255,23,68,0.2)',
            padding: '8px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--red)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            transition: 'all 0.3s',
          }} disabled={isWaiting || isShowingTyping} onClick={() => handleAction('report')} onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(255,23,68,0.2)'; }} onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(255,23,68,0.1)'; }}>
            <Flag size={16} /> REPORT
          </button>
          <button 
            onClick={handleClearChat}
            style={{
              background: 'rgba(0,229,255,0.1)',
              border: '1px solid rgba(0,229,255,0.2)',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              transition: 'all 0.3s',
            }} 
            onMouseEnter={e => { (e.currentTarget as any).style.background = 'rgba(0,229,255,0.2)'; }} 
            onMouseLeave={e => { (e.currentTarget as any).style.background = 'rgba(0,229,255,0.1)'; }}
          >
            � RESTART
          </button>
        </div>
      </div>

      {/* 🔥 Messages Container - Centered with proper spacing */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: 'flex',
            justifyContent: msg.isOwn ? 'flex-end' : 'flex-start',
            animation: 'fadeIn 0.3s ease-in',
          }}>
            <div style={{
              maxWidth: '70%',
              padding: '12px 16px',
              borderRadius: '16px',
              fontSize: '14px',
              fontFamily: 'var(--font-body)',
              wordWrap: 'break-word',
              background: msg.isOwn ? 'var(--red)' : 'var(--card)',
              color: msg.isOwn ? '#fff' : 'rgba(255,255,255,0.8)',
              border: msg.isOwn ? 'none' : '1px solid rgba(255,23,68,0.1)',
              boxShadow: msg.isOwn ? '0 4px 12px rgba(255,23,68,0.2)' : 'none',
            }}>
              <p style={{ margin: 0, lineHeight: 1.4 }}>
                {/* Parse and render links in message */}
                {msg.text.split(/(\[.*?\]\(.*?\))/g).map((part, idx) => {
                  const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/)
                  if (linkMatch) {
                    const [, label, url] = linkMatch
                    return (
                      <a
                        key={idx}
                        onClick={(e) => {
                          e.preventDefault()
                          handleLinkClick(label)
                        }}
                        style={{
                          color: msg.isOwn ? '#fff' : 'var(--cyan)',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          transition: 'all 0.3s',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as any).style.color = msg.isOwn ? '#fff' : 'var(--red)'
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as any).style.color = msg.isOwn ? '#fff' : 'var(--cyan)'
                        }}
                      >
                        {label}
                      </a>
                    )
                  }
                  return <span key={idx}>{part}</span>
                })}
              </p>
              <p style={{
                fontSize: '11px',
                marginTop: '6px',
                opacity: 0.7,
                fontFamily: 'var(--font-mono)',
              }}>
                {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isShowingTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'fadeIn 0.3s ease-in' }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '16px',
              background: 'var(--card)',
              border: '1px solid rgba(255,23,68,0.1)',
              display: 'flex',
              gap: '6px',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: 'rgba(255,255,255,0.4)',
                borderRadius: '50%',
                animation: 'bounce 1.4s infinite',
              }}></div>
              <div style={{
                width: '8px',
                height: '8px',
                background: 'rgba(255,255,255,0.4)',
                borderRadius: '50%',
                animation: 'bounce 1.4s infinite 0.2s',
              }}></div>
              <div style={{
                width: '8px',
                height: '8px',
                background: 'rgba(255,255,255,0.4)',
                borderRadius: '50%',
                animation: 'bounce 1.4s infinite 0.4s',
              }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 🔥 Input Section - Fixed at bottom */}
      <div style={{
        background: 'var(--card)',
        borderTop: '1px solid rgba(255,23,68,0.1)',
        padding: '16px 24px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-end',
        maxWidth: '900px',
        margin: '0 auto',
        width: 'calc(100% - 48px)',
      }}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type your response..."
          disabled={isWaiting || isShowingTyping || gameState !== 'active'}
          style={{
            flex: 1,
            border: '1px solid rgba(255,23,68,0.1)',
            borderRadius: '24px',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.3s',
          }}
          onFocus={e => { (e.currentTarget as any).style.borderColor = 'rgba(255,23,68,0.3)'; (e.currentTarget as any).style.background = 'rgba(255,255,255,0.08)'; }}
          onBlur={e => { (e.currentTarget as any).style.borderColor = 'rgba(255,23,68,0.1)'; (e.currentTarget as any).style.background = 'rgba(255,255,255,0.05)'; }}
        />
        <button
          onClick={handleSendMessage}
          disabled={isWaiting || isShowingTyping || !userInput.trim()}
          style={{
            background: 'var(--red)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '10px 16px',
            cursor: isWaiting || isShowingTyping || !userInput.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: (isWaiting || isShowingTyping || !userInput.trim()) ? 0.5 : 1,
            transition: 'all 0.3s',
          }}
        >
          <Send size={18} />
        </button>
      </div>

      {/* 🔥 Confirmation Screen - Shows Scam Type */}
      {showConfirmation.show && scammer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 5, 9, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: 'var(--card)',
            border: '2px solid var(--red)',
            borderRadius: '16px',
            padding: '48px 32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 0 60px rgba(255,23,68,0.4)',
            animation: 'slideUp 0.4s ease-out',
            textAlign: 'center',
          }}>
            {/* Success Icon */}
            <div style={{
              fontSize: '64px',
              marginBottom: '24px',
              animation: 'pulse 1s ease-in-out infinite',
            }}>
              ✅
            </div>

            {/* Title */}
            <h2 style={{
              fontFamily: 'var(--font-head)',
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'var(--cyan)',
              margin: '0 0 16px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}>
              YOU IDENTIFIED CORRECTLY!
            </h2>

            {/* Scam Type Display */}
            <div style={{
              background: 'rgba(255,23,68,0.1)',
              border: '2px solid var(--red)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '32px',
            }}>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--cyan)',
                margin: '0 0 12px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>
                🎯 SCAM TYPE DETECTED:
              </p>
              <h3 style={{
                fontFamily: 'var(--font-head)',
                fontSize: '28px',
                fontWeight: 'bold',
                color: 'var(--red)',
                margin: '0 0 16px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}>
                {scammer.type === 'relative_contact' && '👨‍👩‍👧‍👦 RELATIVE IMPERSONATION'}
                {scammer.type === 'friend_contact' && '👥 FRIEND EMERGENCY'}
                {scammer.type === 'bank_agent' && '🏦 BANK FRAUD'}
                {scammer.type === 'tech_support' && '💻 TECH SUPPORT'}
                {scammer.type === 'investment_advisor' && '📈 INVESTMENT SCAM'}
                {scammer.type === 'government_official' && '🏛️ GOVERNMENT SCAM'}
                {scammer.type === 'delivery_company' && '📦 DELIVERY SCAM'}
                {scammer.type === 'telecom_operator' && '📱 TELECOM SCAM'}
              </h3>

              {/* Scammer Details */}
              <div style={{
                background: 'rgba(0,229,255,0.05)',
                borderLeft: '4px solid var(--cyan)',
                padding: '12px 16px',
                borderRadius: '4px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.8)',
                lineHeight: 1.6,
              }}>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>Caller:</strong> {scammer.name}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Action Taken:</strong> {showConfirmation.action === 'block' ? '🚫 Blocked' : '🚨 Reported to Authorities'}
                </p>
              </div>
            </div>

            {/* Points Info */}
            <div style={{
              background: 'rgba(0,229,255,0.1)',
              border: '1px solid var(--cyan)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '32px',
              color: 'var(--cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
            }}>
              <p style={{ margin: '0 0 8px' }}>
                ⭐ +{showConfirmation.action === 'block' ? '15' : '20'} ROUND 2 POINTS
              </p>
              <p style={{ margin: 0, opacity: 0.7 }}>
                Total Score This Round: {roundScore}
              </p>
            </div>

            {/* Continue Button */}
            <button
              onClick={async () => {
                setShowConfirmation({ show: false, action: '' })
                setIsWaiting(true)
                
                try {
                  // 🔥 Close the game room on backend
                  if (roomCode) {
                    await fetch(`http://localhost:8000/game/close/${roomCode}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    }).catch(() => {}) // Silent fail if endpoint doesn't exist yet
                  }
                } catch (e) {
                  console.log('Room close request sent')
                }
                
                // Redirect to leaderboard page after a brief delay
                setTimeout(() => {
                  router.push(`/leaderboard?room=${roomCode}&player=${playerId}&round2=true`)
                }, 500)
              }}
              style={{
                background: 'linear-gradient(135deg, var(--red), #ff5577)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '16px 32px',
                fontFamily: 'var(--font-head)',
                fontSize: '14px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 0 20px rgba(255,23,68,0.3)',
              }}
              onMouseEnter={e => {
                (e.target as HTMLButtonElement).style.boxShadow = '0 0 40px rgba(255,23,68,0.6)'
                ;(e.target as HTMLButtonElement).style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(255,23,68,0.3)'
                ;(e.target as HTMLButtonElement).style.transform = 'translateY(0)'
              }}
            >
              🏆 VIEW LEADERBOARD
            </button>
          </div>
        </div>
      )}

      {/* 🔥 Dynamic Modal for Block/Report Actions */}
      {modalAction.type && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 5, 9, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'var(--card)',
            border: `2px solid ${modalAction.type === 'block' ? 'var(--red)' : 'var(--red)'}`,
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: `0 0 40px ${modalAction.type === 'block' ? 'rgba(255,23,68,0.3)' : 'rgba(255,23,68,0.3)'}`,
            animation: 'slideUp 0.3s ease-out',
          }}>
            {/* Modal Title */}
            <h3 style={{
              fontFamily: 'var(--font-head)',
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'var(--red)',
              margin: '0 0 12px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}>
              {modalAction.type === 'block' ? '🚫 BLOCK CONTACT?' : '🚨 REPORT AS SCAM?'}
            </h3>

            {/* Modal Message */}
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '14px',
              lineHeight: 1.6,
              margin: '0 0 24px',
              fontFamily: 'var(--font-body)',
            }}>
              {modalAction.type === 'block' 
                ? 'Block this contact to prevent them from messaging you? They can still call if they have your number.'
                : 'Report this as a scam to help protect other users? Your report will be reviewed by moderators.'}
            </p>

            {/* Point Values */}
            <div style={{
              background: 'rgba(0,229,255,0.05)',
              border: '1px solid rgba(0,229,255,0.2)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '24px',
              fontSize: '12px',
              color: 'var(--cyan)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.5px',
            }}>
              <div style={{ marginBottom: '8px' }}>
                ✅ YES: +{modalAction.type === 'block' ? '15' : '20'} POINTS
              </div>
              <div>
                ❌ NO: 0 POINTS
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}>
              <button
                onClick={() => handleConfirmAction(modalAction.type!, true)}
                disabled={isWaiting}
                style={{
                  background: 'var(--red)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  transition: 'all 0.3s',
                  opacity: isWaiting ? 0.6 : 1,
                  pointerEvents: isWaiting ? 'none' : 'auto',
                }}
                onMouseEnter={e => { if (!isWaiting) (e.currentTarget as any).style.background = '#ff5577'; }}
                onMouseLeave={e => { if (!isWaiting) (e.currentTarget as any).style.background = 'var(--red)'; }}
              >
                YES, {modalAction.type === 'block' ? 'BLOCK' : 'REPORT'}
              </button>
              <button
                onClick={() => handleConfirmAction(modalAction.type!, false)}
                disabled={isWaiting}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--cyan)',
                  border: '1px solid rgba(0,229,255,0.3)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  transition: 'all 0.3s',
                  opacity: isWaiting ? 0.6 : 1,
                  pointerEvents: isWaiting ? 'none' : 'auto',
                }}
                onMouseEnter={e => { if (!isWaiting) (e.currentTarget as any).style.background = 'rgba(0,229,255,0.1)'; }}
                onMouseLeave={e => { if (!isWaiting) (e.currentTarget as any).style.background = 'rgba(255,255,255,0.05)'; }}
              >
                NO, CONTINUE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 Round Score Display */}
      {roundScore > 0 && gameState === 'active' && (
        <div style={{
          position: 'fixed',
          top: '32px',
          right: '24px',
          background: 'linear-gradient(135deg, var(--red), rgba(255,23,68,0.5))',
          border: '2px solid var(--red)',
          borderRadius: '12px',
          padding: '16px 24px',
          color: '#fff',
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          fontWeight: 'bold',
          letterSpacing: '1px',
          zIndex: 100,
          boxShadow: '0 0 30px rgba(255,23,68,0.3)',
          animation: 'slideInRight 0.3s ease-out',
        }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>ROUND 2 SCORE</div>
          <div style={{ fontSize: '20px', color: 'var(--cyan)' }}>{roundScore} pts</div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.7; }
          30% { transform: translateY(-10px); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
