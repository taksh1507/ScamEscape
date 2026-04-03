'use client'
import React from 'react'
import { useEffect, useRef, useState } from 'react'
import { STATS } from '@/lib/constants'
import { useCounter } from '@/hooks/useCounter'
import { formatNumber } from '@/lib/utils'

function StatItem({ stat, trigger }: { stat: typeof STATS[0]; trigger: boolean }) {
  const value = useCounter(stat.target, 2000, trigger)
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--font-head)', fontSize: '42px', color: '#fff',
        letterSpacing: '2px', textShadow: '0 0 20px rgba(255,23,68,0.4)',
      }}>
        {formatNumber(value)}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '11px',
        color: 'var(--muted)', letterSpacing: '2px',
        textTransform: 'uppercase', marginTop: '4px',
      }}>
        {stat.label}
      </div>
    </div>
  )
}

interface HeroProps {
  onStartClick: () => void
  onHowItWorks: () => void
}

export default function Hero({ onStartClick, onHowItWorks }: HeroProps) {
  const particleRef = useRef<HTMLDivElement>(null)
  const statsRef    = useRef<HTMLDivElement>(null)
  const [counterOn, setCounterOn] = useState(false)

  // Generate particles
  useEffect(() => {
    const container = particleRef.current
    if (!container) return
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div')
      const x    = Math.random() * 100
      const dur  = 6 + Math.random() * 10
      const drift = (Math.random() - 0.5) * 150
      const delay = -Math.random() * dur
      p.style.cssText = `
        position:absolute;border-radius:50%;background:var(--red);
        bottom:0;left:${x}%;
        width:${1 + Math.random() * 2}px;height:${1 + Math.random() * 2}px;
        opacity:${0.2 + Math.random() * 0.6};
        animation:float ${dur}s ${delay}s linear infinite;
        --drift:${drift}px;
      `
      container.appendChild(p)
    }
    return () => { if (container) container.innerHTML = '' }
  }, [])

  // Trigger stat counters on scroll into view
  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setCounterOn(true); obs.disconnect() }
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', zIndex: 2, padding: '80px 40px 0',
    }}>
      {/* Particles */}
      <div ref={particleRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} />

      {/* Glow orb */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(ellipse,rgba(255,23,68,0.08) 0%,transparent 70%)',
        animation: 'glowPulse 4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', maxWidth: '900px' }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.3)',
          padding: '6px 18px', borderRadius: '2px',
          fontFamily: 'var(--font-mono)', fontSize: '12px',
          color: 'var(--red)', letterSpacing: '2px', textTransform: 'uppercase',
          marginBottom: '32px', animation: 'fadeSlideDown 0.8s ease both',
        }}>
          <span style={{ width: '6px', height: '6px', background: 'var(--red)', borderRadius: '50%', animation: 'blink 1.2s ease-in-out infinite' }} />
          AI Training Platform — v2.4.1 — LIVE
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--font-head)',
          fontSize: 'clamp(56px,9vw,120px)',
          lineHeight: 0.9, letterSpacing: '4px', color: '#fff',
          marginBottom: '8px', animation: 'fadeSlideUp 0.9s 0.2s ease both',
        }}>
          <span style={{ display: 'block', textShadow: '0 0 60px rgba(255,255,255,0.1)' }}>SCAM</span>
          <span style={{ display: 'block', color: 'var(--red)', textShadow: '0 0 40px rgba(255,23,68,0.5)', animation: 'flicker 6s ease-in-out infinite' }}>ESCAPE</span>
          <span style={{ display: 'block', WebkitTextStroke: '1px rgba(255,255,255,0.2)', color: 'transparent', fontSize: '0.75em', letterSpacing: '8px' }}>INTELLIGENCE</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '16px', color: 'var(--muted)', letterSpacing: '1px',
          maxWidth: '560px', margin: '24px auto 48px', lineHeight: 1.7,
          animation: 'fadeSlideUp 1s 0.4s ease both',
        }}>
          Train your instincts against{' '}
          <strong style={{ color: 'var(--cyan)', fontWeight: 600 }}>real-world scam scenarios</strong>.
          AI-driven simulations that make you impossible to deceive.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', animation: 'fadeSlideUp 1s 0.6s ease both' }}>
          <button
            onClick={onStartClick}
            style={{
              position: 'relative', background: 'var(--red)', color: '#fff', border: 'none',
              padding: '16px 40px', fontFamily: 'var(--font-body)', fontSize: '15px',
              fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase',
              cursor: 'pointer', clipPath: 'polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%)',
              boxShadow: '0 0 30px rgba(255,23,68,0.4)', transition: 'all 0.3s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--pink)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)' }}
          >
            START SIMULATION
          </button>
          <button
            onClick={onHowItWorks}
            style={{
              background: 'transparent', color: 'var(--text)',
              border: '1px solid rgba(255,23,68,0.4)',
              padding: '15px 36px', fontFamily: 'var(--font-body)',
              fontSize: '15px', fontWeight: 600, letterSpacing: '2px',
              textTransform: 'uppercase', cursor: 'pointer',
              clipPath: 'polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%)',
              transition: 'all 0.3s',
            }}
          >
            HOW IT WORKS
          </button>
        </div>

        {/* Stats */}
        <div
          ref={statsRef}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '48px', marginTop: '72px', paddingTop: '40px',
            borderTop: '1px solid rgba(255,23,68,0.1)',
            animation: 'fadeSlideUp 1s 0.8s ease both', flexWrap: 'wrap',
          }}
        >
          {STATS.map((stat, i) => (
  <React.Fragment key={stat.id}>
    <StatItem stat={stat} trigger={counterOn} />
    {i < STATS.length - 1 && (
      <div style={{ width: '1px', height: '48px', background: 'rgba(255,23,68,0.2)' }} />
    )}
  </React.Fragment>
))}
        </div>

        {/* Scroll cue */}
        <div style={{
          position: 'absolute', bottom: '-60px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          animation: 'fadeSlideUp 1s 1.2s ease both',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--muted)', letterSpacing: '3px', textTransform: 'uppercase' }}>SCROLL</span>
          <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom,var(--red),transparent)', animation: 'scrollLine 2s ease-in-out infinite' }} />
        </div>
      </div>
    </section>
  )
}