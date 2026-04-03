'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGameSocket, RoundResultEntry, GameEvent } from '@/hooks/useGameSocket'

// ─── Types ────────────────────────────────────────────────────────────────────
type CallState = 'waiting' | 'incoming' | 'connected' | 'decision' | 'declined' | 'ended'

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
  const stopRef = useRef<(() => void) | null>(null)

  const play = useCallback(() => {
    try {
      // Create audio context if it doesn't exist
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      const ctx = ctxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      let running = true
      const ring = () => {
        if (!running || ctx.state === 'closed') return
        
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()
        
        osc1.frequency.value = 440
        osc2.frequency.value = 480
        gain.gain.value = 0.15
        
        osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination)
        
        osc1.start(); osc2.start()
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.8)
        
        osc1.stop(ctx.currentTime + 1.8)
        osc2.stop(ctx.currentTime + 1.8)
        
        if (running) setTimeout(ring, 3500)
      }
      ring()

      stopRef.current = () => {
        running = false
        if (ctx.state !== 'closed') {
          ctx.suspend().catch(() => {})
        }
      }
    } catch (err) {
      console.warn('Ringtone play failed:', err)
    }
  }, [])

  const stop = useCallback(() => {
    if (stopRef.current) {
      stopRef.current()
      stopRef.current = null
    }
  }, [])

  return { play, stop }
}

function useTTS() {
  const speakLine = useCallback((text: string, onEnd: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setTimeout(onEnd, text.length * 40) // Faster fallback estimation
      return
    }
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate  = 1.2 // Increased speed for realism
    utt.pitch = 1.0
    utt.volume = 1
    
    const loadVoicesAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices()
      // Prefer a natural sounding male voice if available
      const preferred = voices.find(v =>
        v.lang.startsWith('en') && v.name.toLowerCase().includes('google') && v.name.toLowerCase().includes('male')
      ) ?? voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')) 
        ?? voices.find(v => v.lang.startsWith('en')) ?? null
      
      if (preferred) utt.voice = preferred
      
      utt.onend = onEnd
      utt.onerror = onEnd
      window.speechSynthesis.speak(utt)
    }

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        loadVoicesAndSpeak()
        window.speechSynthesis.onvoiceschanged = null
      }
    } else {
      loadVoicesAndSpeak()
    }
  }, [])

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }, [])

  return { speakLine, cancel }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TranscriptLine({ text }: { text: string }) {
  return (
    <div style={{
      padding: '12px 16px', background: 'rgba(255,23,68,0.06)',
      border: '1px solid rgba(255,23,68,0.15)', marginBottom: '10px',
      animation: 'fadeSlideUp 0.35s ease both',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--red)', letterSpacing: '3px', marginBottom: '5px' }}>
        CALLER
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
  const { speakLine, cancel: cancelTTS } = useTTS()

  const [callState, setCallState] = useState<CallState>('waiting')
  const [callData, setCallData] = useState<CallData | null>(null)
  const [transcript, setTranscript] = useState<string[]>([])
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const [results, setResults] = useState<any>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const handleMessage = useCallback((evt: GameEvent) => {
    console.log('CallSimulation message received:', evt)
    if (evt.event === 'start_round') {
      const { type, content } = evt.data
      if (type === 'call') {
        console.log('Round 1 Start: Call simulation detected')
        setCallData(content as CallData)
        setCallState('incoming')
      }
    } else if (evt.event === 'round_result') {
      setResults(evt)
      setCallState('ended')
      stopRing()
      cancelTTS()
    }
  }, [stopRing, cancelTTS])

  const { submitAction } = useGameSocket(roomCode, playerId, handleMessage)

  // Manage ringtone with useEffect for reliability
  useEffect(() => {
    if (callState === 'incoming') {
      playRing()
    } else {
      stopRing()
    }
    return () => stopRing()
  }, [callState, playRing, stopRing])

  // Start voice playback loop
  const startVoicePlayback = useCallback((index: number, script: string[]) => {
    if (index >= script.length) {
      console.log('Script playback complete, moving to decision phase')
      setCallState('decision')
      return
    }

    const line = script[index]
    setCurrentLineIndex(index)
    setTranscript(prev => [...prev, line])

    speakLine(line, () => {
      // Significantly reduced delay between sentences for natural pacing (400ms)
      setTimeout(() => {
        startVoicePlayback(index + 1, script)
      }, 400)
    })
  }, [speakLine])

  // --- Actions ---

  const handleAnswer = (e: React.MouseEvent, option: string) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('User selected option:', option)
    
    // Provide immediate visual feedback
    const target = e.currentTarget as HTMLButtonElement
    target.style.background = 'rgba(255,23,68,0.2)'
    target.style.borderColor = 'var(--red)'
    
    submitAction(option)
  }

  const handleAccept = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Call Accepted by user click')
    
    stopRing()
    setCallState('connected')
    
    if (callData) {
      setTimeout(() => {
        startVoicePlayback(0, callData.script)
      }, 1000)
    }
    
    submitAction('accept')
  }

  const handleDecline = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Call Declined by user click')
    
    stopRing()
    cancelTTS()
    setCallState('declined')
    submitAction('decline')
  }

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
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <div style={{
            width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,23,68,0.1)',
            border: '2px solid var(--red)', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '56px', color: 'var(--red)', animation: 'pulseRing 2s infinite'
          }}>👤</div>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '8px', letterSpacing: '1px' }}>{callData.caller}</h2>
          <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>INCOMING CALL...</div>
        </div>

        <div style={{ display: 'flex', gap: '48px', position: 'relative', zIndex: 200 }}>
          {/* Decline Button */}
          <button 
            onClick={handleDecline}
            style={{ 
              width: '100px', height: '100px', borderRadius: '50%', background: '#ff1744', 
              border: 'none', cursor: 'pointer', fontSize: '32px', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(255,23,68,0.4)',
              transition: 'transform 0.2s', pointerEvents: 'all', zIndex: 300
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ pointerEvents: 'none' }}>📞</span>
          </button>
          
          {/* Accept Button */}
          <button 
            onClick={handleAccept}
            style={{ 
              width: '100px', height: '100px', borderRadius: '50%', background: '#00e676', 
              border: 'none', cursor: 'pointer', fontSize: '32px', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(0,230,118,0.4)',
              transition: 'transform 0.2s', pointerEvents: 'all', zIndex: 300
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ pointerEvents: 'none' }}>📞</span>
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
          </div>
        </div>

        {/* Call Box */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', padding: '32px', marginBottom: '40px', borderRadius: '8px' }}>
          {callState === 'connected' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👤</div>
                <div>
                  <div style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>{callData?.caller}</div>
                  <div style={{ color: '#00e676', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>SECURE LINE ACTIVE</div>
                </div>
              </div>
              
              <div style={{ minHeight: '240px', maxHeight: '400px', overflowY: 'auto' }}>
                {transcript.map((line, i) => (
                  <TranscriptLine key={i} text={line} />
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          ) : callState === 'decision' ? (
            <div>
              <div style={{ 
                background: 'rgba(255,23,68,0.1)', 
                border: '1px solid var(--red)', 
                padding: '24px', 
                borderRadius: '4px', 
                marginBottom: '32px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--red)', letterSpacing: '3px', marginBottom: '12px' }}>SECURITY PROTOCOL</div>
                <h3 style={{ fontSize: '18px', color: '#fff', lineHeight: 1.5 }}>{callData?.question}</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {callData?.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={(e) => handleAnswer(e, opt)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      padding: '16px',
                      fontFamily: 'var(--font-body)',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      letterSpacing: '1px',
                      pointerEvents: 'all',
                      position: 'relative',
                      zIndex: 300
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--red)'
                      e.currentTarget.style.background = 'rgba(255,23,68,0.05)'
                    }}
                    onMouseLeave={e => {
                      if (e.currentTarget.style.background !== 'rgba(255, 23, 68, 0.2)') {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                      }
                    }}
                  >
                    {opt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          ) : callState === 'declined' ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '24px' }}>📵</div>
              <h3 style={{ fontSize: '24px', color: 'var(--red)', marginBottom: '12px' }}>CALL DECLINED</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Waiting for simulation results...</p>
            </div>
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
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '32px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', minWidth: '100px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>SCORE</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>
                    +{results?.results?.find((r: any) => r.player_id === playerId)?.points_awarded || 0}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', minWidth: '100px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>GRADE</div>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: 700, 
                    color: results?.results?.find((r: any) => r.player_id === playerId)?.grade_color || '#fff' 
                  }}>
                    {results?.results?.find((r: any) => r.player_id === playerId)?.grade_letter || 'F'}
                  </div>
                </div>
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

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '32px' }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '16px', letterSpacing: '1px' }}>SIMULATION COMPLETE</div>
                <button 
                  onClick={() => router.push('/')}
                  style={{ 
                    background: 'var(--red)', 
                    color: '#fff', 
                    border: 'none', 
                    padding: '16px 32px', 
                    cursor: 'pointer', 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '12px', 
                    fontWeight: 700,
                    letterSpacing: '2px', 
                    pointerEvents: 'all',
                    boxShadow: '0 0 20px rgba(255,23,68,0.3)'
                  }}
                >RETURN TO BASE</button>
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
      `}</style>
    </div>
  )
}
