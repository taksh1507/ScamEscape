import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FraudGuard AI — Interactive Scam Training Platform',
  description: 'Train your instincts against real-world scam scenarios. AI-driven simulations.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        
        <div className="grid-bg" />
        <div className="vignette" />
        {children}
      </body>
    </html>
  )
}
