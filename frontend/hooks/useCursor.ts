'use client'
import { useEffect } from 'react'

export function useCursor() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const dot  = document.getElementById('cursor')
    const ring = document.getElementById('cursor-ring')
    if (!dot || !ring) return

    let mx = 0, my = 0, rx = 0, ry = 0
    let rafId: number

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
      dot.style.left = mx + 'px'
      dot.style.top  = my + 'px'
    }

    const animate = () => {
      rx += (mx - rx) * 0.12
      ry += (my - ry) * 0.12
      ring.style.left = rx + 'px'
      ring.style.top  = ry + 'px'
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)

    const expand  = () => { ring.style.width = '56px'; ring.style.height = '56px'; ring.style.borderColor = 'rgba(255,23,68,0.8)' }
    const shrink  = () => { ring.style.width = '36px'; ring.style.height = '36px'; ring.style.borderColor = 'rgba(255,23,68,0.5)' }

    document.addEventListener('mousemove', onMove)
    document.querySelectorAll('a, button, .room-card, .diff-btn').forEach(el => {
      el.addEventListener('mouseenter', expand)
      el.addEventListener('mouseleave', shrink)
    })

    return () => {
      document.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
    }
  }, [])
}