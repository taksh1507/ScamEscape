'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PlayPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home page - /play page not needed anymore
    router.push('/')
  }, [router])

  return null
}
