'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGameSocket, RoundResultEntry, GameEvent } from '@/hooks/useGameSocket'

// ─── Types ────────────────────────────────────────────────────────────────────
type CallState = 'waiting' | 'incoming' | 'connected' | 'decision' | 'declined' | 'waiting_for_results' | 'ended'

interface CallData {
  caller: string
  script: string[]
  question: string
  options: string[]
}

interface Props {
  roomCode: string | null
  playerId: string | null
}

// ─── Audio helpers (Web Audio API ringtone + Web Speech API TTS) ──────────────

function useRingtone() {
  const ctxRef  = useRef<AudioContext | null>(null)
  const oscillatorsRef = useRef<OscillatorNode[]>([])
  const gainNodesRef = useRef<GainNode[]>([])
  const stopRef = useRef<(() => void) | null>(null)

  const play = useCallback(() => {
    try {
      console.log('🔔 Ringtone: Starting...')
      console.log('🔔 Window AudioContext available:', !!window.AudioContext)
      
      // Create audio context if it doesn't exist
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) {
          console.error('❌ AudioContext not available in this browser!')
          return
        }
        ctxRef.current = new AudioContextClass()
        console.log('✅ AudioContext created, state:', ctxRef.current.state, 'sampleRate:', ctxRef.current.sampleRate)
      }
      
      const ctx = ctxRef.current
      console.log('🔔 Using AudioContext state:', ctx.state)
      
      // Resume context if suspended
      const resumeAndPlay = () => {
        if (ctx.state === 'suspended') {
          console.log('⏸️  AudioContext suspended, resuming...')
          ctx.resume().then(() => {
            console.log('✅ AudioContext resumed, state now:', ctx.state)
            startRingtoneLoop()
          }).catch((err) => {
            console.error('❌ Failed to resume AudioContext:', err)
            startRingtoneLoop()
          })
        } else {
          startRingtoneLoop()
        }
      }

      let isRunning = true

      const startRingtoneLoop = () => {
        console.log('🎵 Starting ringtone loop')
        
        const playBeep = () => {
          if (!isRunning || ctx.state === 'closed') {
            console.log('🔇 Ringtone stopped')
            return
          }

          try {
            // Create fresh oscillators and gain nodes for this beep
            const osc1 = ctx.createOscillator()
            const osc2 = ctx.createOscillator()
            const gainNode = ctx.createGain()
            
            // Set frequencies (phone ringtone: 440Hz + 480Hz)
            osc1.frequency.value = 440
            osc2.frequency.value = 480
            
            // Set type
            osc1.type = 'sine'
            osc2.type = 'sine'
            
            // Connect to gain
            osc1.connect(gainNode)
            osc2.connect(gainNode)
            gainNode.connect(ctx.destination)
            
            // Set volume envelope for this beep
            gainNode.gain.setValueAtTime(0.15, ctx.currentTime)      // Start at 0.15
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8)  // Fade out over 0.8s
            
            // Start and stop
            const now = ctx.currentTime
            osc1.start(now)
            osc2.start(now)
            osc1.stop(now + 0.8)
            osc2.stop(now + 0.8)
            
            console.log('✅ Ringtone beep played at', now, 'volume: 0.15')
            
            // Clean up references
            oscillatorsRef.current.push(osc1, osc2)
            gainNodesRef.current.push(gainNode)
            
            // Schedule next beep (2.5 second gap between beeps)
            if (isRunning) {
              setTimeout(playBeep, 2500)
            }
          } catch (err) {
            console.error('❌ Error creating oscillators:', err)
          }
        }

        playBeep()

        stopRef.current = () => {
          console.log('🔇 Ringtone stop requested')
          isRunning = false
          // Stop any active oscillators
          oscillatorsRef.current.forEach((osc) => {
            try {
              osc.stop()
            } catch (e) {
              // Already stopped
            }
          })
          oscillatorsRef.current = []
          gainNodesRef.current = []
        }
      }

      resumeAndPlay()
    } catch (err) {
      console.error('❌ Ringtone initialization failed:', err)
    }
  }, [])

  const stop = useCallback(() => {
    console.log('🛑 Stop ringtone called')
    if (stopRef.current) {
      stopRef.current()
      stopRef.current = null
    }
  }, [])

  return { play, stop }
}

function useTTS() {
  const isSpeakingRef = useRef(false);
  
  const speakLine = useCallback((text: string, onEnd: () => void) => {
    console.log(`🔊 TTS: Speaking "${text.substring(0, 50)}..."`)
    
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('⚠️ Speech Synthesis not available')
      setTimeout(onEnd, text.length * 40)
      return
    }

    // Prevent overlapping speech
    if (isSpeakingRef.current) {
      console.log('⏸️ TTS already speaking, queuing cancel...')
      window.speechSynthesis.cancel()
    }

    // Safety fallback: if speech synthesis fails or hangs, ensure onEnd is called
    const safetyTimeout = setTimeout(() => {
      console.warn('⚠️ TTS safety timeout triggered');
      isSpeakingRef.current = false;
      window.speechSynthesis.cancel();
      onEnd();
    }, Math.max(text.length * 100 + 3000, 5000)); // At least 5 seconds

    const utt = new SpeechSynthesisUtterance(text)
    utt.rate  = 0.95  // Slightly slower for clarity
    utt.pitch = 1.0
    utt.volume = 1
    
    const handleEnd = () => {
      console.log('✅ TTS Speaking completed')
      clearTimeout(safetyTimeout);
      isSpeakingRef.current = false;
      onEnd();
    };

    const loadVoicesAndSpeak = () => {
      try {
        const voices = window.speechSynthesis.getVoices()
        console.log(`🎤 Available voices: ${voices.length}`)
        
        // Prefer male English voice, fallback to any English voice
        let preferred = voices.find(v => {
          const isEnglish = v.lang.startsWith('en') || v.lang.includes('en-')
          const isMale = v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('guy') || v.name.toLowerCase().includes('man')
          return isEnglish && isMale
        })
        
        if (!preferred) {
          preferred = voices.find(v => {
            const isEnglish = v.lang.startsWith('en') || v.lang.includes('en-')
            const notFemale = !v.name.toLowerCase().includes('female') && !v.name.toLowerCase().includes('woman') && !v.name.toLowerCase().includes('lady')
            return isEnglish && notFemale
          })
        }
        
        if (!preferred) {
          preferred = voices.find(v => v.lang.startsWith('en-US') || v.lang.startsWith('en'))
        }
        
        if (!preferred && voices.length > 0) {
          preferred = voices[0]  // Fallback to any voice
        }
        
        if (preferred) {
          utt.voice = preferred
          console.log(`✅ Using voice: ${preferred.name} (${preferred.lang})`)
        } else {
          console.warn('⚠️ No suitable voice found')
        }
        
        utt.onstart = () => {
          console.log('🔊 TTS: Speech started')
          isSpeakingRef.current = true;
        }
        
        utt.onend = () => {
          console.log('✅ TTS event: onend triggered')
          handleEnd()
        }
        
        utt.onerror = (event) => {
          // "interrupted" error is not fatal - it means another utterance started
          if (event.error === 'interrupted') {
            console.log('ℹ️ TTS: Speech interrupted (expected if player chose action while speaking)')
          } else {
            console.error('❌ TTS error:', event.error)
          }
          handleEnd()
        }
        
        try {
          window.speechSynthesis.speak(utt)
          console.log('✅ TTS speak() called successfully')
        } catch (e) {
          console.error('❌ TTS speak() error:', e)
          isSpeakingRef.current = false;
          handleEnd()
        }
      } catch (err) {
        console.error('❌ TTS loadVoicesAndSpeak error:', err)
        isSpeakingRef.current = false;
        handleEnd()
      }
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length === 0) {
      console.log('⏳ Waiting for voices to load...')
      window.speechSynthesis.onvoiceschanged = () => {
        console.log('📢 Voices loaded')
        loadVoicesAndSpeak()
        window.speechSynthesis.onvoiceschanged = null
      }
    } else {
      loadVoicesAndSpeak()
    }
  }, [])

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined') {
      console.log('🔇 Cancelling TTS')
      isSpeakingRef.current = false;
      window.speechSynthesis?.cancel()
    }
  }, [])

  return { speakLine, cancel }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TranscriptLine({ text, role }: { text: string, role?: 'user' | 'scammer' }) {
  const isUser = role === 'user';
  return (
    <div style={{
      padding: '12px 16px', 
      background: isUser ? 'rgba(0,230,118,0.06)' : 'rgba(255,23,68,0.06)',
      border: isUser ? '1px solid rgba(0,230,118,0.15)' : '1px solid rgba(255,23,68,0.15)', 
      marginBottom: '10px',
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      animation: 'fadeSlideUp 0.35s ease both',
      borderRadius: '4px',
      maxWidth: '85%'
    }}>
      <div style={{ 
        fontFamily: 'var(--font-mono)', 
        fontSize: '9px', 
        color: isUser ? '#00e676' : 'var(--red)', 
        letterSpacing: '3px', 
        marginBottom: '5px' 
      }}>
        {isUser ? 'YOU' : 'CALLER'}
      </div>
      <div style={{ fontSize: '15px', color: '#fff', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
        &ldquo;{text}&rdquo;
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CallSimulation({ roomCode, playerId }: Props) {
  const router = useRouter()
  const { play: playRing, stop: stopRing } = useRingtone()
  
  // 🔥 Fallback simple beep using Audio element (for browsers where Web Audio fails)
  const playSimpleBeep = useCallback(() => {
    try {
      // Create a simple sine wave beep using data URL
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
      
      console.log('🔔 Simple beep played')
    } catch (err) {
      console.error('Failed to play beep:', err)
    }
  }, [])
  const { speakLine, cancel: cancelTTS } = useTTS()

  const [callState, setCallState] = useState<CallState>('waiting')
  const [callData, setCallData] = useState<CallData | null>(null)
  const [transcript, setTranscript] = useState<{text: string, role: 'user' | 'scammer'}[]>([])
  const [suggestedActions, setSuggestedActions] = useState<any[]>([])
  const [decisionResult, setDecisionResult] = useState<any>(null)
  const [evaluation, setEvaluation] = useState<any>(null)  // 🔥 Store AI evaluation feedback
  const [results, setResults] = useState<any>(null)
  const [totalRounds, setTotalRounds] = useState(1)
  const [currentRound, setCurrentRound] = useState(0)
  // 🔥 Removed isSubmitting - all options always enabled
  const [ringtoneActive, setRingtoneActive] = useState(false)  // 🔥 Track ringtone status
  const [clockSkew, setClockSkew] = useState(0)  // 🔥 Track clock difference between client and server
  const [scamPhase, setScamPhase] = useState<'success' | 'failure' | null>(null)  // 🔥 Track if user was scammed
  const [roundScore, setRoundScore] = useState(0)  // 🔥 Score for Round 1
  const [userResponseCount, setUserResponseCount] = useState(0)  // 🔥 Count how many times user clicked options
  const [showResultsModal, setShowResultsModal] = useState(false)  // 🔥 Show results modal after round
  const [showCongratulations, setShowCongratulations] = useState(false)  // 🎉 Show celebratory congratulations modal first
  const [showLoadingTransition, setShowLoadingTransition] = useState(false)  // ⏳ Show loading between congratulations and results
  const [showPersonalMsg, setShowPersonalMsg] = useState(false)  // 👤 Personal message popup
  const [personalMsgAction, setPersonalMsgAction] = useState<'end' | 'continue' | null>(null)  // 👤 Which action triggered it
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null)  // 🔥 Safety timeout ref
  const conversationLogRef = useRef<{role: 'scammer'|'user', text: string, risk_level?: string}[]>([])  // 🔥 Buffer all exchanges
  const pendingActionsRef = useRef<any[]>([])  // 🔥 Store actions to show after TTS finishes

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  // 🔥 Sync clock with server on mount to fix TTL validation
  useEffect(() => {
    const syncClock = async () => {
      let maxRetries = 3
      let retryDelay = 500 // Start with 500ms
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
          const clientTime = Date.now() / 1000
          console.log(`🕐 Clock sync attempt ${attempt}/${maxRetries} at ${clientTime}...`)
          
          const response = await fetch(`${baseUrl}/health/time`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }
          
          const data = await response.json()
          const serverTime = data.server_time
          const skew = serverTime - clientTime
          setClockSkew(skew)
          console.log(`✅ Clock synced on attempt ${attempt}: skew = ${skew.toFixed(3)}s (server is ${skew >= 0 ? 'ahead' : 'behind'})`)
          return // Success - exit retry loop
        } catch (err) {
          console.warn(`⚠️ Clock sync attempt ${attempt}/${maxRetries} failed:`, err)
          
          if (attempt < maxRetries) {
            // Exponential backoff: 500ms, 1s, 2s
            await new Promise(resolve => setTimeout(resolve, retryDelay))
            retryDelay *= 2
          } else {
            // Final attempt failed - use skew of 0
            console.warn('❌ Clock sync failed after all retries (using 0 skew)')
            setClockSkew(0)
          }
        }
      }
    }
    
    syncClock()
  }, [])

  // 🔥 Cleanup: Clear safety timeout on unmount
  useEffect(() => {
    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current)
        safetyTimeoutRef.current = null
      }
    }
  }, [])

  // 🔴 Generate random score for Round 1 (Call Simulation)
  const generateRound1Score = (phase: 'success' | 'failure') => {
    if (phase === 'success') {
      // ✅ User detected the scam successfully = 70-100 (higher rewards for smart detection)
      return Math.floor(Math.random() * 31) + 70
    } else {
      // ❌ User got scammed = 1-50 (lower score for failure)
      return Math.floor(Math.random() * 50) + 1
    }
  }

  // 🔴 Generate score when results modal is shown
  useEffect(() => {
    if (showResultsModal && scamPhase && roundScore === 0) {
      const score = generateRound1Score(scamPhase)
      console.log(`📊 ROUND 1 SCORE GENERATED: ${score}/${scamPhase === 'failure' ? 100 : 50}`)
      setRoundScore(score)
    }
  }, [showResultsModal, scamPhase, roundScore])

  const handleMessage = useCallback((evt: GameEvent) => {
    console.log('📬 CallSimulation event received:', evt.event, evt)
    
    // Capture game start info
    if (evt.event === 'game_start') {
      console.log('🎮 GAME_START EVENT:', evt)
      setTotalRounds(evt.total_rounds)
      console.log('✅ Total rounds set to:', evt.total_rounds)
    } else if (evt.event === 'start_round') {
      console.log('🔔 START_ROUND EVENT:', evt.data)
      console.log('✅ start_round received - no strict TTL check needed (message just arrived from server)')
      
      // 🔥 RESET INTERACTION COUNT FOR NEW ROUND
      setUserResponseCount(0)
      console.log('🔄 User response count reset to 0 for new round')
      
      // Don't validate TTL for initial start_round - if the message arrived, it's fresh enough
      // TTL validation is for ensuring freshness during the game, not for the initial trigger

      const { type, content, round_number } = evt.data
      setCurrentRound(round_number)
      console.log(`📊 Type check: type="${type}" (${typeof type}), checking if === "call"`)
      if (type === 'call' || type?.toString() === 'call') {  // 🔥 Handle both string and enum values
        console.log('✅ Call simulation detected - setting callData and state to incoming')
        setCallData(content as CallData)
        setCallState('incoming')
        console.log('🔔 CALL STATE → INCOMING (ringtone should start in 100ms)')
      } else {
        console.warn(`❌ Type mismatch: expected "call", got "${type}" - NOT starting ringtone`)
      }
    } else if (evt.event === 'call_update') {
      const { data, player_id: targetPlayerId } = evt;
      if (targetPlayerId === playerId) {
        console.log('📞 CALL_UPDATE: scammer message received - phase:', data.phase)
        
        // 🔥 Store AI evaluation if present (can be null for initial message)
        if ('evaluation' in data) {
          console.log('🤖 AI Evaluation received:', data.evaluation)
          setEvaluation(data.evaluation)  // Set to evaluation or null
        }
        
        // 🔥 FIX: Check if this is a terminal phase (scammed/congratulations) FIRST
        // TTL validation completely removed - accept all messages
        const isTerminal = data.phase === 'failure' || data.phase === 'success' 
                        || data.message?.toLowerCase().includes('disconnected')
                        || data.message?.toLowerCase().includes('call ended')
                        || data.message?.toLowerCase().includes('congratulations')
                        || data.message?.toLowerCase().includes('scammed');
        
        // ✅ SKIP ALL TTL CHECKS - Accept all messages immediately
        console.log(`📨 Accepting message: ${data.message?.substring(0, 50)}...`)

        setTranscript(prev => [...prev, { text: data.message, role: 'scammer' }]);
        
        // 🔥 Store actions to show immediately
        pendingActionsRef.current = data.suggested_actions || []
        
        // 🔥 Show options immediately (don't wait for speech)
        console.log('📢 Setting suggested actions from call_update:', data.suggested_actions)
        setSuggestedActions(data.suggested_actions || [])
        
        // 🔥 Buffer this message for later scoring
        conversationLogRef.current.push({ role: 'scammer', text: data.message })
        
        // Clear previous decision result when new message arrives
        setDecisionResult(null);
        
        if (isTerminal) {
          console.log('🎯 Call ended - Phase:', data.phase)
          setScamPhase(data.phase as 'success' | 'failure')  // 🔥 Track the phase
          setRingtoneActive(false)
          setSuggestedActions([])  // 🔥 Hide buttons immediately when call ends
          setEvaluation(null)  // Clear evaluation when call ends
          setCallState('waiting_for_results')
          stopRing()
          cancelTTS()
          
          // Show result based on phase
          const verdict = data.phase === 'success' 
            ? '✅ You avoided the scam!' 
            : '❌ You were scammed!';
          
          console.log('📊 RESULT:', verdict)
          
          // 🔥 NO TTS FOR SCAMMED - Just show the modal immediately
          setShowResultsModal(true)
          
          return
        }

        // 🔥 FIXED: Don't auto-transition to decision after every message
        // Keep in 'connected' state and let audio play continuously
        // Decision buttons stay visible from when call was accepted
        
        // 🔥 CLEAR safety timeout — backend responded with call_update
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current)
          safetyTimeoutRef.current = null
        }

        // Speak the message (options already shown above)
        if (callState === 'connected' || callState === 'decision') {
          speakLine(data.message, () => {
            console.log('✓ Message spoken')
          });
        } else if (callState === 'incoming') {
          // First message - options will be shown by auto-answer after speaking
          console.log('📱 First message during incoming')
        } else {
          // If we're not connected yet, transition to connected
          setCallState('connected')
        }
      }
    } else if (evt.event === 'game_over') {
      // All rounds complete - navigate to final results
      console.log('🏁 GAME_OVER EVENT')
      const params = `?room=${roomCode}&player=${playerId}`
      router.push(`/result${params}`)
    } else if (evt.event === 'timer_tick') {
      // 🔥 Timer tick - check TTL (2 second validity)
      if (evt.ttl) {
        const clientTime = Date.now() / 1000;
        const currentTime = clientTime + clockSkew;
        const ttlExpiry = evt.ttl;
        
        if (currentTime > ttlExpiry + 2) {
          console.warn(`⏰ EXPIRED: timer_tick TTL exceeded, skipping`)
          return
        }
      }
      console.log(`⏱️ Timer: ${evt.remaining}s remaining`)
    } else {
      console.log('❓ Unknown event:', evt.event)
    }
  }, [playerId, stopRing, cancelTTS, speakLine, callState, router, roomCode, totalRounds])

  const { submitAction, sendUserAction } = useGameSocket(roomCode, playerId, handleMessage)

  // Manage ringtone with useEffect for reliability
  useEffect(() => {
    console.log(`📱 Call State Changed: ${callState}`)
    
    if (callState !== 'incoming') {
      console.log('🔇 Stopping ringtone (not incoming)')
      setRingtoneActive(false)
      stopRing()
      return
    }

    // INCOMING state: play ringtone and set up auto-answer
    console.log('🔔 PLAYING RINGTONE...')
    setRingtoneActive(true)
    playRing()
    
    // 🔥 AUTO-ANSWER after 10 seconds
    const autoAnswerTimer = setTimeout(() => {
      console.log('📱 Auto-answering call after 10 seconds...')
      console.log('📝 Transcript available:', transcript.length, 'items')
      setRingtoneActive(false)
      stopRing()
      setCallState('connected')
      
      // Speak the first message if available
      if (transcript.length > 0 && transcript[0].role === 'scammer') {
        if (pendingActionsRef.current && pendingActionsRef.current.length > 0) {
          console.log('✓ Showing first message options immediately:', pendingActionsRef.current)
          setSuggestedActions(pendingActionsRef.current)
        }

        console.log('🔊 Speaking first message:', transcript[0].text)
        speakLine(transcript[0].text, () => {
          console.log('✓ First message spoken, confirming options...')
          if (pendingActionsRef.current && pendingActionsRef.current.length > 0) {
            setSuggestedActions(pendingActionsRef.current)
          }
          setCallState('decision')
        })
      } else {
        console.warn('⚠️ No transcript available after 10 seconds, moving to decision anyway')
        setCallState('decision')
      }
      
      // Submit accept action with a small delay
      setTimeout(() => {
        console.log('📤 Submitting accept action to backend')
        submitAction('accept')
      }, 100)
    }, 10000)
    
    // Cleanup: stop ringtone when state changes away from incoming
    return () => {
      clearTimeout(autoAnswerTimer)
      setRingtoneActive(false)
      stopRing()
    }
  }, [callState, playRing, stopRing, transcript, speakLine, submitAction])

  // --- Actions ---

  const handleAnswer = useCallback((e: React.MouseEvent, option: any) => {
    e.preventDefault()
    e.stopPropagation()
    
    const optionText = typeof option === 'string' ? option : option.option;
    console.log('✏️ User selected option:', optionText)
    
    // 🔥 INCREMENT USER RESPONSE COUNT (for every interaction)
    const newResponseCount = userResponseCount + 1
    setUserResponseCount(newResponseCount)
    console.log(`📊 User response count: ${newResponseCount}`)
    
    // Update transcript
    setTranscript(prev => [...prev, { text: optionText, role: 'user' }]);
    
    // 🔥 Buffer this message for later scoring
    const riskLevel = typeof option === 'object' ? option.risk_level : 'medium'
    conversationLogRef.current.push({ role: 'user', text: optionText, risk_level: riskLevel })
    
    // Buttons remain open and clickable - no disabling
    
    // 🔥 HANG-UP LOGIC: Hang up at ANY TIME = Success (escaped safely, not scammed)
    const isHangUp = optionText.toLowerCase().includes('hang up') 
                  || optionText.toLowerCase().includes('block')
                  || optionText.toLowerCase().includes('disconnect');
    
    console.log(`📞 CHECKING OPTION: "${optionText}" | Hang-up: ${isHangUp}`)
    
    if (isHangUp) {
      // ✅ HANG UP AT ANY TIME = SUCCESS: User escaped without falling for the scam
      console.log('✅ HANG-UP AT ANY TIME: User escaped the scam! Marking as success...')
      setScamPhase('success')  // Always success when hanging up
      cancelTTS()
      stopRing()
      setCallState('waiting_for_results')
      setShowCongratulations(true)  // 🎉 Show celebratory modal first
      return
    }
    
    // 🔥 SCAMMED OPTIONS: If user clicks options that indicate they fell for the scam
    const optLower = optionText.toLowerCase();
    const isScammedOption = optLower.includes('provide card')
                         || optLower.includes('give card')
                         || optLower.includes('give bank')
                         || optLower.includes('share bank')
                         || optLower.includes('share cvv')
                         || optLower.includes('send money')
                         || optLower.includes('confirm payment')
                         || optLower.includes('proceed payment')
                         || optLower.includes('authorize transfer')
                         || optLower.includes('otp')
                         || optLower.includes('card number')
                         || optLower.includes('bank account')
                         || optLower.includes('account number')
                         || optLower.includes('confirm details')
                         || optLower.includes('verify identity')
                         || optLower.includes('verify account')
                         || optLower.includes('complete transaction')
                         || optLower.includes('authorize')
                         || optLower.includes('confirm')
                         || optLower.includes('yes, proceed')
                         || optLower.includes('yes i will')
                         || optLower.includes('i agree')
                         || optLower.includes('send cvv')
                         || optLower.includes('send otp')
                         || optLower.includes('transfer funds')
                         || optLower.includes('make payment');
    
    if (isScammedOption) {
      // ❌ USER FELL FOR THE SCAM - they provided sensitive info
      console.log('❌ USER PROVIDED SENSITIVE INFO - MARKING AS SCAMMED...')
      console.log('🔍 Option text matched:', optionText)
      setScamPhase('failure')  // User got scammed
      cancelTTS()
      stopRing()
      setCallState('waiting_for_results')
      setShowResultsModal(true)
      return
    }
    
    // Non-hang-up actions: send and wait
    sendUserAction(option)
    
    console.log('ℹ️ Non-hang-up action - waiting for next call_update...')
    setCallState('connected')

    // 🔥 Safety timeout: If no response after 15 seconds, assume backend issue
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
    safetyTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ No response from backend after 15 seconds - forcing reset')
      alert('Server is not responding. Please refresh the page.')
    }, 15000)
  }, [sendUserAction, stopRing, cancelTTS, transcript, speakLine])

  const handleAccept = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('Call Accepted by user click')
    
    stopRing()
    setCallState('connected')
    
    // The first message is already in transcript from call_update
    // Just need to speak it if it hasn't been spoken yet
    if (transcript.length > 0 && transcript[0].role === 'scammer') {
      speakLine(transcript[0].text, () => {
        setCallState('decision')
      })
    }
    
    // 🔥 Safety timeout: If no response after 15 seconds, assume backend issue
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
    safetyTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ No response from backend after 15 seconds - forcing reset')
      alert('Server is not responding. Please refresh the page.')
    }, 15000)
    
    submitAction('accept')
  }, [stopRing, transcript, speakLine, submitAction])

  const handleDecline = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('Call Declined by user click')
    
    stopRing()
    cancelTTS()
    // Don't set to 'declined' - wait for actual round_result from backend
    console.log('Sending hang_up action to backend, waiting for results...')
    submitAction('hang_up')
  }, [stopRing, cancelTTS, submitAction])

  //  End Game Handler - Shows personal message
  const handleEndGame = useCallback(() => {
    console.log('✅ END GAME PRESSED')
    setPersonalMsgAction('end')
    setShowPersonalMsg(true)
  }, [])

  // 👤 Confirm End Game - Finalize
  const confirmEndGame = useCallback(() => {
    console.log('✅ GAME OVER - Player ended call')
    setShowPersonalMsg(false)
    setScamPhase('failure')
    cancelTTS()
    stopRing()
    setCallState('waiting_for_results')
    setShowResultsModal(true)
  }, [cancelTTS, stopRing])

  // --- Renders ---

  const baseStyles: React.CSSProperties = {
    position: 'relative',
    zIndex: 100,
    minHeight: '100vh',
    width: '100%',
    background: '#000',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column'
  }

  // 1. Waiting for event
  if (callState === 'waiting') {
    return (
      <div style={{ ...baseStyles, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--red)', letterSpacing: '4px', marginBottom: '16px' }}>ESTABLISHING NEURAL LINK</div>
          <div style={{ width: '240px', height: '2px', background: 'rgba(255,23,68,0.2)', margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%', background: 'var(--red)', animation: 'scan 2s infinite' }} />
          </div>
        </div>
      </div>
    )
  }

  // 2. Incoming Call Screen
  if (callState === 'incoming' && callData) {
    return (
      <div style={{ ...baseStyles, background: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          {/* Ringtone Display - Responsive */}
          <div style={{
            width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,23,68,0.15)',
            border: '3px solid var(--red)', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '80px', color: 'var(--red)', animation: 'pulseRing 1s infinite'
          }}>📞</div>
          
          <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px', letterSpacing: '1px', color: '#fff' }}>{callData.caller}</h2>
          <div style={{ fontSize: '18px', color: '#ff5577', fontFamily: 'var(--font-mono)', marginBottom: '16px', fontWeight: 700, letterSpacing: '2px' }}>INCOMING CALL</div>
          
          {ringtoneActive && (
            <div style={{ 
              fontSize: '20px', 
              color: '#00e676', 
              fontFamily: 'var(--font-mono)', 
              letterSpacing: '2px',
              animation: 'pulse 0.8s infinite',
              marginTop: '16px',
              fontWeight: 700
            }}>
              🔔 RINGING...
            </div>
          )}
          
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '16px', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>Auto-accepting in 10 seconds</div>
        </div>

        <div style={{ display: 'flex', gap: '32px', position: 'relative', zIndex: 200 }}>
          {/* Decline Button */}
          <button 
            onClick={handleDecline}
            style={{ 
              width: '80px', height: '80px', borderRadius: '50%', background: '#ff1744', 
              border: 'none', cursor: 'pointer', fontSize: '36px', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(255,23,68,0.4)',
              transition: 'all 0.2s', zIndex: 300
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span style={{ pointerEvents: 'none' }}>❌</span>
          </button>
          
          {/* Accept Button */}
          <button 
            onClick={handleAccept}
            style={{ 
              width: '80px', height: '80px', borderRadius: '50%', background: '#00e676', 
              border: 'none', cursor: 'pointer', fontSize: '36px', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(0,230,118,0.4)',
              transition: 'all 0.2s', zIndex: 300
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span style={{ pointerEvents: 'none' }}>✅</span>
          </button>
        </div>
      </div>
    )
  }

  // 3. Connected / Declined / Ended Screens
  return (
    <div style={{ ...baseStyles, padding: '60px 20px' }}>
      <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--red)', letterSpacing: '3px', fontWeight: 700 }}>SIMULATION ROUND 01</div>
            <div style={{ fontSize: '20px', color: '#fff', fontWeight: 700 }}>CALL INTERFACE</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>STATUS</div>
            <div style={{ 
              fontSize: '14px', 
              color: callState === 'connected' ? '#00e676' : 'var(--red)', 
              fontWeight: 700,
              fontFamily: 'var(--font-mono)' 
            }}>
              {callState.toUpperCase()}
            </div>
            {/* 🔥 Visual indicator for ringtone status */}
            {ringtoneActive && (
              <div style={{
                fontSize: '10px',
                color: '#ffd700',
                marginTop: '8px',
                letterSpacing: '2px',
                animation: 'pulse 1s infinite'
              }}>
                🔔 RINGING
              </div>
            )}
          </div>
        </div>

        {/* Call Box */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', padding: '32px', marginBottom: '40px', borderRadius: '8px' }}>
          {(callState === 'connected' || callState === 'decision') ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👤</div>
                <div>
                  <div style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>{callData?.caller}</div>
                  <div style={{ color: '#00e676', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>SECURE LINE ACTIVE</div>
                </div>
              </div>
              
              <div style={{ minHeight: '240px', maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', marginBottom: '24px' }}>
                {transcript.map((line, i) => (
                  <TranscriptLine key={i} text={line.text} role={line.role} />
                ))}
                
                {/* 🔥 AI Evaluation Feedback - Shows dynamically after user action */}
                {evaluation && typeof evaluation === 'object' && (
                  <div style={{ marginTop: '20px', padding: '16px', background: evaluation.status === 'SURVIVED' ? 'rgba(0,230,118,0.15)' : 'rgba(255,23,68,0.15)', borderRadius: '6px', borderLeft: '4px solid ' + (evaluation.status === 'SURVIVED' ? '#00e676' : '#ff1744'), color: '#fff', fontSize: '12px', animation: 'slideIn 0.3s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 700 }}>
                      <span>{evaluation.status === 'SURVIVED' ? '✅ SAFE ACTION' : '⚠️ RISKY ACTION'}</span>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>+{evaluation.points_earned} pts</span>
                    </div>
                    <p style={{ margin: '8px 0', color: 'rgba(255,255,255,0.8)' }}>📋 {evaluation.reason}</p>
                    <p style={{ margin: '8px 0', color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>💡 Better action: {evaluation.safer_action}</p>
                    <p style={{ margin: '8px 0', color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>🎯 Confidence: {Math.round(evaluation.confidence * 100)}%</p>
                  </div>
                )}
                
                {transcript.length > 0 && transcript[transcript.length - 1].role === 'user' && !evaluation && (
                  <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(0,230,118,0.1)', borderRadius: '4px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', textAlign: 'center' }}>
                    ⏳ Processing your decision...
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </div>
              
              {/* All dynamic options - no tags, no colors, just clean buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '24px' }}>
                {(() => {
                  const options = suggestedActions.length > 0 ? suggestedActions : (callData?.options || []);
                  
                  // Always add "Hang up" if not present
                  const hasHangUp = options.some(opt => {
                    const text = typeof opt === 'string' ? opt : opt.option;
                    return text.toLowerCase().includes('hang up') || text.toLowerCase().includes('block') || text.toLowerCase().includes('disconnect');
                  });
                  
                  if (!hasHangUp) {
                    options.push({ option: 'Hang up' });
                  }
                  
                  return options.map((opt, i) => {
                    const text = typeof opt === 'string' ? opt : opt.option;
                    
                    return (
                      <button
                        key={i}
                        onClick={(e) => handleAnswer(e, opt)}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '2px solid rgba(255,255,255,0.25)',
                          color: '#fff',
                          padding: '16px 20px',
                          fontFamily: 'var(--font-body)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center',
                          letterSpacing: '0.5px',
                          position: 'relative',
                          zIndex: 300,
                          minHeight: '50px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          textTransform: 'uppercase'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
                          e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                          e.currentTarget.style.boxShadow = '0 0 15px rgba(255,255,255,0.15)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
                          e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        {text}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          ) : callState === 'waiting_for_results' ? (
            // Waiting for round_result after terminal action
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '24px', animation: 'pulse 1s infinite' }}>⏳</div>
              <h3 style={{ fontSize: '24px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>Processing...</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Evaluating your decision...</p>
            </div>
          ) : callState === 'ended' ? (
            // Show actual results based on what backend sent
            results ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '24px' }}>
                  {results?.results?.find((r: any) => r.player_id === playerId)?.points_awarded > 0 ? '✅' : '❌'}
                </div>
                <h3 style={{ 
                  fontSize: '24px', 
                  color: results?.results?.find((r: any) => r.player_id === playerId)?.points_awarded > 0 ? 'var(--green)' : 'var(--red)',
                  marginBottom: '12px' 
                }}>
                  {results?.results?.find((r: any) => r.player_id === playerId)?.points_awarded > 0 ? '✓ CORRECT RESPONSE!' : '✗ YOU GOT SCAMMED'}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', marginBottom: '8px' }}>
                  {results?.results?.find((r: any) => r.player_id === playerId)?.points_awarded > 0 ? '✓ CORRECT RESPONSE!' : '✗ YOU GOT SCAMMED'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontStyle: 'italic', marginTop: '16px' }}>
                  Transitioning to Round 2...
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
                <p style={{ color: 'rgba(255,255,255,0.6)' }}>Waiting for results...</p>
              </div>
            )
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '24px' }}>
                {results?.results?.find((r: any) => r.player_id === playerId)?.points_awarded > 0 ? '✔️' : '❌'}
              </div>
              <h3 style={{ 
                fontSize: '28px', 
                color: results?.results?.find((r: any) => r.player_id === playerId)?.points_awarded > 0 ? '#00e676' : 'var(--red)', 
                marginBottom: '16px',
                fontWeight: 800,
                letterSpacing: '1px'
              }}>
                {results?.results?.find((r: any) => r.player_id === playerId)?.points_awarded > 0 ? 'CORRECT DECISION!' : 'CRITICAL FAILURE!'}
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
              </div>


              <div style={{ 
                background: 'rgba(0,230,118,0.05)', 
                border: '1px solid rgba(0,230,118,0.2)', 
                padding: '24px', 
                borderRadius: '8px',
                textAlign: 'left',
                marginBottom: '40px'
              }}>
                <div style={{ fontSize: '11px', color: '#00e676', letterSpacing: '2px', fontWeight: 700, marginBottom: '12px' }}>PRO-TIP:</div>
                <p style={{ color: '#fff', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                  {results?.results?.find((r: any) => r.player_id === playerId)?.tip || "Stay alert! Legitimate organizations will never ask for sensitive data over unsolicited calls."}
                </p>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '40px', marginTop: '40px' }}>
                {/* Round Transmission Header */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '8px 24px',
                    background: 'linear-gradient(135deg, #00e5ff, #0099ff)',
                    color: '#000',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '3px',
                    borderRadius: '50px',
                    marginBottom: '24px'
                  }}>
                    ROUND 1 COMPLETE
                  </div>
                  <h2 style={{ 
                    fontSize: '36px', 
                    color: '#00e5ff', 
                    margin: '0 0 16px 0',
                    fontWeight: 700,
                    letterSpacing: '2px'
                  }}>
                    TRANSMISSION IN PROGRESS
                  </h2>
                  <p style={{ 
                    color: 'rgba(255,255,255,0.6)', 
                    fontSize: '16px', 
                    margin: 0,
                    lineHeight: '1.6'
                  }}>
                    Initializing Round 2: WhatsApp Scam Detection
                  </p>
                </div>

                {/* Enhanced Loading Animation */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0,229,255,0.08), rgba(0,153,255,0.05))',
                  border: '2px solid rgba(0,229,255,0.3)',
                  borderRadius: '16px',
                  padding: '48px 32px',
                  textAlign: 'center',
                  marginBottom: '32px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Animated background gradient */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.1), transparent)',
                    animation: 'slideGradient 2s infinite'
                  }} />

                  {/* Loading spinner container - SINGLE CIRCLE */}
                  <div style={{ marginBottom: '28px', position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '120px' }}>
                    {/* Background glow effect */}
                    <div style={{
                      position: 'absolute',
                      width: '100px',
                      height: '100px',
                      background: 'radial-gradient(circle, rgba(0,229,255,0.3), transparent)',
                      borderRadius: '50%',
                      animation: 'pulse 2s ease-in-out infinite',
                      filter: 'blur(15px)'
                    }} />
                    
                    {/* Single rotating circle */}
                    <div style={{
                      position: 'relative',
                      width: '80px',
                      height: '80px',
                      border: '4px solid rgba(0,229,255,0.2)',
                      borderTop: '4px solid #00e5ff',
                      borderRadius: '50%',
                      animation: 'spin 2s linear infinite'
                    }} />
                  </div>

                  {/* Status text */}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <p style={{ 
                      color: '#00e5ff', 
                      fontSize: '16px', 
                      fontWeight: 600,
                      margin: '0 0 8px 0',
                      letterSpacing: '1px'
                    }}>
                      🔄 Loading Round 2...
                    </p>
                    <p style={{ 
                      color: 'rgba(255,255,255,0.5)', 
                      fontSize: '13px', 
                      margin: 0,
                      letterSpacing: '0.5px'
                    }}>
                      Preparing WhatsApp fraud simulation
                    </p>
                  </div>
                </div>

                {/* Progress steps */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    background: 'rgba(0,230,118,0.1)',
                    border: '1px solid rgba(0,230,118,0.3)',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '8px' }}>✅</div>
                    <div style={{ color: '#00ff88', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>
                      CALL ANALYZED
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(0,229,255,0.1)',
                    border: '2px solid rgba(0,229,255,0.4)',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '8px', animation: 'bounce 1s ease-in-out infinite' }}>📱</div>
                    <div style={{ color: '#00e5ff', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>
                      CHAT LOADING
                    </div>
                  </div>
                </div>

                {/* Preparation message */}
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <p style={{ 
                    color: 'rgba(255,255,255,0.7)', 
                    fontSize: '12px', 
                    margin: 0,
                    lineHeight: '1.6'
                  }}>
                    💡 In Round 2, you'll receive WhatsApp messages from a scammer. Stay vigilant and detect the fraud!
                  </p>
                </div>

                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                  @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.15); opacity: 1; }
                  }
                  @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                  }
                  @keyframes slideGradient {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                  }
                `}</style>
              </div>
            </div>
          )}
        </div>

        {/* UI Hints */}
        {callState === 'connected' && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '2px' }}>
            NEURAL TRANSCRIPT ACTIVE • DO NOT DISCONNECT
          </div>
        )}
      </div>

      {/* 🎉 CONGRATULATIONS MODAL - Shows when you hang up */}
      {showCongratulations && scamPhase === 'success' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.98)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          overflow: 'auto',
          padding: '20px',
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '600px',
            width: '100%',
            padding: '50px 40px',
            background: 'linear-gradient(135deg, rgba(0,170,0,0.2) 0%, rgba(0,255,136,0.1) 100%)',
            border: '2px solid #00ff88',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '30px'
          }}>
            {/* Celebration Animation */}
            <div style={{
              fontSize: '80px',
              animation: 'bounce 0.8s ease-in-out infinite'
            }}>
              🎉
            </div>

            {/* Title */}
            <div style={{
              fontSize: '36px',
              fontWeight: 800,
              color: '#00ff88',
              letterSpacing: '3px',
              textTransform: 'uppercase'
            }}>
              YOU ESCAPED!
            </div>

            {/* Subtitle */}
            <div style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.8)',
              lineHeight: '1.6'
            }}>
              You successfully identified the scam and hung up at the right time. Smart move!
            </div>

            {/* Score Display */}
            {roundScore > 0 && (
              <div style={{
                fontSize: '64px',
                fontWeight: 800,
                color: '#00ff88',
                fontFamily: 'monospace',
                marginBottom: '12px'
              }}>
                {roundScore}
                <span style={{ fontSize: '24px', color: 'rgba(255,255,255,0.6)', marginLeft: '8px' }}>/ 100</span>
              </div>
            )}

            {/* Achievement Badges */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              width: '100%',
              marginTop: '20px'
            }}>
              <div style={{
                background: 'rgba(0,255,136,0.1)',
                border: '1px solid #00ff88',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '13px',
                color: '#00ff88',
                fontWeight: 700,
                letterSpacing: '1px'
              }}>
                ✅ AWARENESS CHECK
              </div>
              <div style={{
                background: 'rgba(0,255,136,0.1)',
                border: '1px solid #00ff88',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '13px',
                color: '#00ff88',
                fontWeight: 700,
                letterSpacing: '1px'
              }}>
                ✅ QUICK RESPONSE
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={() => {
                setShowCongratulations(false)
                // Generate score since we're moving to results now
                if (roundScore === 0) {
                  const score = Math.floor(Math.random() * 31) + 70
                  setRoundScore(score)
                }
                setShowResultsModal(true)
              }}
              style={{
                background: 'linear-gradient(to right, #00ff88, #00ffaa)',
                color: '#000',
                padding: '16px 48px',
                fontSize: '14px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                transition: 'transform 0.2s',
                marginTop: '20px'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              VIEW DETAILS & CONTINUE
            </button>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-20px); }
            }
          `}</style>
        </div>
      )}

      {/* Results Modal - Shows after Round 1 ends */}
      {showResultsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflow: 'auto',
          padding: '20px'
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '700px',
            width: '100%',
            padding: '40px 30px',
            background: 'rgba(20,20,30,0.9)',
            border: scamPhase === 'success' ? '3px solid #00ff88' : '3px solid #ff5577',
            borderRadius: '12px',
            boxShadow: scamPhase === 'success' ? '0 0 40px rgba(0,255,136,0.3)' : '0 0 40px rgba(255,85,119,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Icon */}
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              {scamPhase === 'success' ? '🎉' : '😱'}
            </div>

            {/* Main Message */}
            <h1 style={{
              fontSize: '36px',
              fontWeight: 700,
              color: '#00ff88',
              marginBottom: '16px',
              letterSpacing: '2px'
            }}>
              YOU ESCAPED!
            </h1>

            {/* Description */}
            <p style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              You successfully hung up and escaped the scam. Well done!
            </p>

            {/* 📊 ROUND 1 SCORE DISPLAY */}
            {roundScore > 0 && (
              <div style={{
                background: 'rgba(0,170,0,0.15)',
                border: '2px solid #00ff88',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px', letterSpacing: '2px', textTransform: 'uppercase' }}>
                  YOUR ROUND 1 SCORE
                </div>
                <div style={{
                  fontSize: '64px',
                  fontWeight: 800,
                  color: '#00ff88',
                  fontFamily: 'monospace',
                  marginBottom: '8px'
                }}>
                  {roundScore}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  Out of 100
                </div>
              </div>
            )}

            {/* Scam Details Box */}
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'left',
              maxHeight: '240px',
              overflowY: 'auto'
            }}>
              <div style={{
                fontSize: '13px',
                color: '#00ff88',
                letterSpacing: '1.5px',
                fontWeight: 700,
                marginBottom: '16px',
                textTransform: 'uppercase'
              }}>
                📊 SCAM DETAILS
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.8)'
              }}>
                <div>
                  <span style={{ color: '#00ff88', fontWeight: 700 }}>Messages:</span> {transcript.filter(t => t.role === 'scammer').length} sent
                </div>
                <div>
                  <span style={{ color: '#00ff88', fontWeight: 700 }}>Duration:</span> ~{Math.round(transcript.filter(t => t.role === 'scammer').length * 30)} seconds
                </div>
                <div>
                  <span style={{ color: '#00ff88', fontWeight: 700 }}>Type:</span> Call Verification Scam
                </div>
                <div>
                  <span style={{ color: '#00ff88', fontWeight: 700 }}>Risk Level:</span> {transcript.filter(t => t.role === 'scammer').length <= 1 ? 'LOW' : transcript.filter(t => t.role === 'scammer').length <= 3 ? 'MEDIUM' : 'HIGH'}
                </div>
              </div>

              <div style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: '1.6'
              }}>
                <span style={{ color: '#ff9800', fontWeight: 700 }}>🚩 Red Flags Detected:</span>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  {transcript.filter(t => t.role === 'scammer').length > 0 && <li>Unsolicited call with urgent claims</li>}
                  {transcript.filter(t => t.role === 'scammer').length > 1 && <li>Requesting sensitive information</li>}
                  {transcript.filter(t => t.role === 'scammer').length > 2 && <li>Using authority/legitimacy tactics</li>}
                  {transcript.filter(t => t.role === 'scammer').length > 4 && <li>Time pressure and threats</li>}
                  {transcript.filter(t => t.role === 'scammer').length > 5 && <li>Emotional manipulation tactics</li>}
                </ul>
              </div>
            </div>

            {/* Key Lesson */}
            <div style={{
              background: scamPhase === 'failure' ? 'rgba(0,255,136,0.1)' : 'rgba(255,85,119,0.1)',
              border: scamPhase === 'failure' ? '1px solid rgba(0,255,136,0.3)' : '1px solid rgba(255,85,119,0.3)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '32px',
              textAlign: 'left'
            }}>
              <div style={{
                fontSize: '12px',
                color: scamPhase === 'failure' ? '#00ff88' : '#ff5577',
                letterSpacing: '2px',
                fontWeight: 700,
                marginBottom: '8px'
              }}>
                🎓 KEY TAKEAWAY
              </div>
              <p style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                margin: 0,
                lineHeight: '1.5'
              }}>
                {scamPhase === 'failure'
                  ? '✅ Never share sensitive information over unsolicited calls. Always verify by hanging up and calling the official number independently.'
                  : scamPhase === 'success'
                  ? '❌ Scammers use urgency, authority, and emotional pressure. Slow down and verify requests independently before sharing anything.'
                  : '⚠️ You caught yourself before it was too late. Trust your instincts and always verify requests through official channels.'}
              </p>
            </div>

            {/* Next Button */}
            <button
              onClick={() => {
                setShowResultsModal(false)
                const params = `?room=${roomCode}&player=${playerId}`
                if (currentRound === 1) {
                  // After Round 1 (Call), go to Round 2 (Chat)
                  console.log(`� Navigating to /simulation/chat${params}`)
                  router.push(`/simulation/chat${params}`)
                }
              }}
              style={{
                background: scamPhase === 'failure' ? 'linear-gradient(to right, #00ff88, #00ffaa)' : 'linear-gradient(to right, #ff5577, #ff7799)',
                color: '#000',
                padding: '16px 48px',
                fontSize: '16px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                transition: 'transform 0.2s',
                position: 'relative',
                zIndex: 50
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              CONTINUE TO ROUND 2
            </button>
          </div>
        </div>
      )}

      {/* 💰 Payment Detection Popup Modal */}
      {/* Payment popup removed - moved to Round 2 Chat Simulation */}

      {/* � Personal Message Popup Modal */}
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
          zIndex: 10000,
          backdropFilter: 'blur(5px)',
          animation: 'fadeSlideUp 0.3s ease-out'
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
            position: 'relative'
          }}>
            {/* Icon */}
            <div style={{
              fontSize: '60px',
              marginBottom: '24px'
            }}>
              {personalMsgAction === 'end' ? '🛑' : '❌'}
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '28px',
              color: '#00e676',
              marginBottom: '16px',
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase'
            }}>
              {personalMsgAction === 'end' ? 'Game Over' : 'Confirm'}
            </h2>

            {/* Message */}
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '32px',
              lineHeight: '1.8',
              fontStyle: 'italic'
            }}>
              {personalMsgAction === 'end' 
                ? '"You gave your payment details to a scammer. Remember: legitimate companies never ask for payment over the phone. Stay safe!"'
                : '"Keep questioning the caller. Look for red flags: urgency, threats, and requests for money. You\'re doing great!"'}
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Confirm End Game Button */}
              <button
                onClick={confirmEndGame}
                style={{
                  padding: '14px 32px',
                  background: 'linear-gradient(135deg, #ff1744, #ff5577)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  transition: 'all 0.3s',
                  position: 'relative',
                  zIndex: 50
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(255,23,68,0.6)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                🛑 Accept Loss
              </button>

              {/* Cancel Button */}
              <button
                onClick={() => {
                  setShowPersonalMsg(false)
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
                  transition: 'all 0.3s',
                  position: 'relative',
                  zIndex: 50
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                }}
                onMouseLeave={e => {
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

      <style jsx global>{`
        @keyframes scan {
          from { left: -100%; }
          to { left: 100%; }
        }
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(255, 23, 68, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(255, 23, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 23, 68, 0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
