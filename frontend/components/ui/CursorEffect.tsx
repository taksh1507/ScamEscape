'use client'
import { useCursor } from '@/hooks/useCursor'

export default function CursorEffect() {
  useCursor()
  return (
    <>
      <div id="cursor"      className="cursor" />
      <div id="cursor-ring" className="cursor-ring" />
    </>
  )
}