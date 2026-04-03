import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Clamp a number between min and max */
export function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max)
}

/** Format large numbers with commas */
export function formatNumber(n: number) {
  return n.toLocaleString()
}