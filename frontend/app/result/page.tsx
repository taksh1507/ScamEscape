'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import CursorEffect from '@/components/ui/CursorEffect'

function ResultContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const score = searchParams.get('score') || '0'
  const mode = searchParams.get('mode') || 'unknown'
  const diff = searchParams.get('diff') || 'medium'
  const correct = searchParams.get('correct') === 'true'

  const handleEnter = () => {
    // Navigation for Result page
  }

  return (
    <>
      <CursorEffect />
      <Navbar onEnter={handleEnter} />

      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 40px 60px',
        }}
      >
        <div 
          style={{
            background: 'var(--card)',
            border: `1px solid ${correct ? 'var(--cyan)' : 'var(--red)'}`,
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '600px',
            width: '100%',
            textAlign: 'center',
            boxShadow: `0 0 40px ${correct ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 23, 68, 0.2)'}`,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative scanline for immersion */}
          <div className="grid-bg" style={{ opacity: 0.1, zIndex: 0 }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 
              style={{
                fontFamily: 'var(--font-head)',
                fontSize: '48px',
                color: correct ? 'var(--cyan)' : 'var(--red)',
                margin: '0 0 8px 0',
                letterSpacing: '4px',
                textTransform: 'uppercase'
              }}
            >
              {correct ? 'Mission Success' : 'Mission Failed'}
            </h1>
            
            <p style={{ color: 'var(--muted)', fontSize: '18px', margin: '0 0 32px 0' }}>
              Mode: <span style={{ color: '#fff', textTransform: 'capitalize' }}>{mode}</span> | 
              Difficulty: <span style={{ color: '#fff', textTransform: 'capitalize' }}>{diff}</span>
            </p>

            <div style={{
              background: 'rgba(0,0,0,0.4)',
              padding: '32px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              marginBottom: '32px'
            }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: '64px', color: '#fff', lineHeight: 1 }}>
                {score} <span style={{ fontSize: '24px', color: 'var(--muted)' }}>XP</span>
              </div>
            </div>

            <div style={{ textAlign: 'left', marginBottom: '40px' }}>
              <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', color: '#fff', marginBottom: '12px' }}>
                AI Analysis:
              </h3>
              <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                {correct 
                  ? 'Excellent threat detection. You recognized the social engineering attempt and denied the attacker access to your sensitive information.'
                  : 'You fell for a common manipulation tactic. Remember: Legitimate organizations will never create artificial panic to force you to share OTPs or click suspicious links.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/play')}
                style={{
                  background: 'transparent',
                  color: '#fff',
                  border: '1px solid var(--border)',
                  padding: '12px 24px',
                  fontFamily: 'var(--font-head)',
                  fontSize: '20px',
                  letterSpacing: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--cyan)'
                  e.currentTarget.style.color = 'var(--cyan)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = '#fff'
                }}
              >
                Play Again
              </button>

              <Link
                href="/leaderboard"
                style={{
                  background: 'var(--red)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  fontFamily: 'var(--font-head)',
                  fontSize: '20px',
                  letterSpacing: '2px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'inline-block',
                  clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--pink)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--red)'}
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: '50px', textAlign: 'center' }}>Loading results...</div>}>
      <ResultContent />
    </Suspense>
  )
}
