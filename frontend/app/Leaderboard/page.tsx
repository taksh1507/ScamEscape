'use client'

import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import LeaderboardPage from '@/components/sections/Leaderboard'


export default function Page() {
  const handleEnter = () => {
    // Scroll to leaderboard section
    document.getElementById('leaderboard')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleHowItWorks = () => {
    // Navigate to home
    window.location.href = '/'
  }

  return (
    <>
      <Navbar onEnter={handleEnter} />
      <main id="leaderboard" style={{
        minHeight: '100vh',
        background: 'var(--dark)',
        color: '#fff'
      }}>
        <LeaderboardPage />
      </main>
      <Footer />
    </>
  )
}