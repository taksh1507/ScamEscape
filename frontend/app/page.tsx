'use client'

import { useState } from 'react'
import Navbar        from '@/components/layout/Navbar'
import Footer        from '@/components/layout/Footer'
import Hero          from '@/components/sections/Hero'
import TickerStrip   from '@/components/sections/TickerStrip'
import Features      from '@/components/sections/Features'
import RoomSection   from '@/components/sections/RoomSection'
import CursorEffect  from '@/components/ui/CursorEffect'
import Toast         from '@/components/ui/Toast'
import { useToast }  from '@/hooks/useToast'
import { useRouter } from 'next/navigation'
export default function HomePage() {
  const { toast, show: showToast } = useToast()

  const handleEnter = () => {
    document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleHowItWorks = () => {
    document.getElementById('simulate')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleStartClick = () => {
    document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' })
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