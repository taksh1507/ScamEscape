'use client'
import Link from 'next/link'
import { useState } from 'react'
import { NAV_LINKS } from '@/lib/constants'

interface NavbarProps {
  onEnter: () => void
}

export default function Navbar({ onEnter }: NavbarProps) {
  const [isLiveScamHovered, setIsLiveScamHovered] = useState(false)
  
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 40px', height: '72px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(5,5,9,0.85)',
      backdropFilter: 'blur(12px)',
    }}>
      {/* Logo */}
      <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
        <div style={{
          width: '40px', height: '40px',
          border: '2px solid var(--red)', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,23,68,0.08)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--red)">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5L20 8.5v7L12 19.5 4 15.5v-7L12 4.5zM12 7a3 3 0 100 6 3 3 0 000-6z"/>
          </svg>
        </div>
        <span style={{ fontFamily: 'var(--font-head)', fontSize: '24px', letterSpacing: '3px', color: '#fff' }}>
          SCAM<span style={{ color: 'var(--red)' }}>ESCAPE</span>
        </span>
      </a>

      {/* Nav Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
        {NAV_LINKS.map(link => (
          <a
            key={link.label}
            href={link.href}
            style={{
              color: 'var(--muted)', textDecoration: 'none',
              fontSize: '14px', fontWeight: 600,
              letterSpacing: '2px', textTransform: 'uppercase',
              transition: 'color 0.3s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            {link.label}
          </a>
        ))}
      </div>
      
      {/* Live Scam Feed Badge */}
      <Link href="/live-scam-feed" style={{ textDecoration: 'none' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '20px',
          background: isLiveScamHovered ? 'rgba(255,23,68,0.25)' : 'rgba(255,23,68,0.15)',
          border: '1.5px solid var(--red)',
          cursor: 'pointer',
          transition: 'all 0.3s',
          textDecoration: 'none',
          boxShadow: isLiveScamHovered ? '0 0 20px rgba(255,23,68,0.4)' : 'none',
        }}
        onMouseEnter={() => setIsLiveScamHovered(true)}
        onMouseLeave={() => setIsLiveScamHovered(false)}
        >
          <span style={{ fontSize: '16px' }}>🚨</span>
          <span style={{
            color: 'var(--red)',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            Live Feed
          </span>
        </div>
      </Link>
      {/* CTA Button */}
      <button
        onClick={onEnter}
        style={{
          background: 'var(--red)', color: '#fff', border: 'none',
          padding: '10px 24px', fontFamily: 'var(--font-body)',
          fontSize: '13px', fontWeight: 700, letterSpacing: '2px',
          textTransform: 'uppercase', cursor: 'pointer',
          clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
          boxShadow: '0 0 20px rgba(255,23,68,0.3)',
          transition: 'background 0.3s, box-shadow 0.3s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--pink)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)' }}
      >
        Enter Platform
      </button>
    </nav>
  )
}
