'use client'
import { useState, useCallback, useRef } from 'react'

interface ToastState {
  title: string
  message: string
  visible: boolean
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ title: '', message: '', visible: false })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((title: string, message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ title, message, visible: true })
    timerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }))
    }, 3200)
  }, [])

  return { toast, show }
}