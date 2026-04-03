'use client'
import { useEffect, useState } from 'react'

export function useCounter(target: number, duration = 2000, trigger = true) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!trigger) return
    let start = 0
    const step = (target / duration) * 16
    const tick = () => {
      start += step
      const current = Math.min(Math.round(start), target)
      setValue(current)
      if (current < target) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration, trigger])

  return value
}