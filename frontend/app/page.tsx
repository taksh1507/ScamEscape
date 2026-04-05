'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Navbar        from '@/components/layout/Navbar'
import Footer        from '@/components/layout/Footer'
import Hero          from '@/components/sections/Hero'
import TickerStrip   from '@/components/sections/TickerStrip'
import Features      from '@/components/sections/Features'
import RoomSection   from '@/components/sections/RoomSection'
import CursorEffect  from '@/components/ui/CursorEffect'
import Toast         from '@/components/ui/Toast'
import { useToast }  from '@/hooks/useToast'

export default function HomePage() {
  const { toast, show: showToast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showGameFinished, setShowGameFinished] = useState(false)

  useEffect(() => {
    const status = searchParams.get('status')
    if (status === 'game_finished') {
      setShowGameFinished(true)
      // Hide after 5 seconds and clear the URL param
      const timer = setTimeout(() => {
        setShowGameFinished(false)
        router.push('/')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, router])

  const handleEnter = () => {
    document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleHowItWorks = () => {
    document.getElementById('simulate')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleStartClick = () => {
    document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (showGameFinished) {
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

          <p style={{
            fontSize: '14px',
            color: 'var(--muted)',
            fontFamily: 'var(--font-body)'
          }}>
            Redirecting to home page...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <CursorEffect />
      <Toast title={toast.title} message={toast.message} visible={toast.visible} />
      <Navbar onEnter={handleEnter} />
      <TickerStrip />
      <main>
        <Hero onStartClick={handleStartClick} onHowItWorks={handleHowItWorks} />
        <Features />
        <RoomSection />
      </main>
      <Footer />
    </>
  )
}
