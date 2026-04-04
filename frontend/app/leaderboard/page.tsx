'use client'

import LeaderboardPage from '@/components/sections/Leaderboard'


export default function Page() {
  return (
    <div className="fixed inset-0 z-[999] bg-[#050509] overflow-y-auto">
      <LeaderboardPage />
    </div>
  )
}