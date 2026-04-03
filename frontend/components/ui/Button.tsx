'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className, children, ...props }, ref) => {
    const base: React.CSSProperties = {
      fontFamily: 'var(--font-body)',
      fontWeight: 700,
      letterSpacing: '2px',
      textTransform: 'uppercase',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.3s',
      position: 'relative',
      overflow: 'hidden',
    }

    const styles: Record<string, React.CSSProperties> = {
      primary: {
        ...base,
        background: 'var(--red)',
        color: '#fff',
        padding: '16px 40px',
        fontSize: '15px',
        clipPath: 'polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%)',
        boxShadow: '0 0 30px rgba(255,23,68,0.4)',
      },
      secondary: {
        ...base,
        background: 'transparent',
        color: 'var(--text)',
        border: '1px solid rgba(255,23,68,0.4)',
        padding: '15px 36px',
        fontSize: '15px',
        fontWeight: 600,
        clipPath: 'polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%)',
      },
    }

    return (
      <button ref={ref} style={styles[variant]} className={cn(className)} {...props}>
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export default Button