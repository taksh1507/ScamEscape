'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import CursorEffect from '@/components/ui/CursorEffect'

interface LeaderboardEntry {
  rank: number
  player_id: string
  nickname: string
  total_score: number
  adaptive_rating: number
  games_played: number
  games_won: number
  games_scammed: number
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const res = await fetch(`${apiUrl}/api/game/leaderboard/global/top`)
        const data = await res.json()
        if (data.leaderboard) {
          setEntries(data.leaderboard)
        }
      } catch (e) {
        console.error('Failed to fetch leaderboard:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [])

  return (
    <>
      <CursorEffect />
      <Navbar onEnter={() => {}} />

      <main style={{ minHeight: '100vh', padding: '120px 40px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', color: 'var(--cyan)', fontSize: '48px', marginBottom: '40px', letterSpacing: '4px' }}>
          GLOBAL LEADERBOARD
        </h1>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '900px', boxShadow: '0 0 40px rgba(0, 229, 255, 0.05)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>Loading real-time ML standings...</div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>No entries found. Be the first to play!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Header Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 150px 150px 150px', gap: '16px', padding: '16px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontFamily: 'var(--font-head)', letterSpacing: '1px' }}>
                <div>RANK</div>
                <div>OPERATIVE</div>
                <div style={{ textAlign: 'right' }}>ML SCORE</div>
                <div style={{ textAlign: 'right' }}>ADAPTIVE RATING</div>
                <div style={{ textAlign: 'right' }}>WIN RATE</div>
              </div>
              
              {/* Data Rows */}
              {entries.map((entry, idx) => {
                const winRate = entry.games_played > 0 ? Math.round((entry.games_won / entry.games_played) * 100) : 0
                return (
                  <div key={idx} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '80px 1fr 150px 150px 150px', 
                    gap: '16px', 
                    padding: '16px', 
                    background: idx === 0 ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: idx === 0 ? '1px solid var(--cyan)' : '1px solid transparent',
                    borderRadius: '8px',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ fontFamily: 'var(--font-head)', fontSize: '24px', color: idx === 0 ? 'var(--cyan)' : 'var(--muted)' }}>
                      #{idx + 1}
                    </div>
                    <div style={{ fontWeight: 'bold', color: idx === 0 ? '#fff' : 'var(--muted)' }}>
                      {entry.nickname}
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-head)', color: 'var(--cyan)' }}>
                      {entry.total_score}
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-head)', color: 'var(--pink)' }}>
                      {entry.adaptive_rating}
                    </div>
                    <div style={{ textAlign: 'right', color: winRate >= 50 ? 'var(--cyan)' : 'var(--red)' }}>
                      {winRate}%
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Link href="/play" style={{
          marginTop: '40px',
          background: 'var(--cyan)',
          color: '#000',
          border: 'none',
          padding: '16px 32px',
          fontFamily: 'var(--font-head)',
          fontSize: '20px',
          letterSpacing: '2px',
          cursor: 'pointer',
          textDecoration: 'none',
          clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
          transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#fff'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--cyan)'}
        >
          START MISSION
        </Link>
      </main>
    </>
  )
}
