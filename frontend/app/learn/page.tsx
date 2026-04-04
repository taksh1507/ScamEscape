'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, ChevronRight, ShieldAlert, MailWarning, Smartphone } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CursorEffect from '@/components/ui/CursorEffect'

const T = {
  mid: '#7070a0',
  green: '#00e676',
  red: '#ff1744',
  cyan: '#00e5ff',
  dim: '#555570',
  border: 'rgba(255,23,68,0.25)',
  purple: '#f50057'
}

const MODULES = [
  {
    id: 'phish',
    color: T.cyan,
    icon: <MailWarning size={24} />,
    title: 'Phishing Defense',
    difficulty: 'easy',
    xp: 50,
    content: 'Phishing is a cyber attack that uses disguised email as a weapon. The goal is to trick the email recipient into believing that the message is something they want or need.',
    flags: ["Generic greetings (Dear Customer)", "Suspicious sender address", "Urgency or threats"],
    quiz: {
      q: 'Which of the following is a major red flag in an email claiming to be from your bank?',
      opts: [
        'A generic greeting like "Dear Customer"',
        'A link to review your recent statements',
        'Contact information in the footer',
      ],
      ans: 0,
      explain: 'Banks almost always use your real name. A generic greeting combined with a sense of urgency is a classic sign of phishing.'
    }
  },
  {
    id: 'vishing',
    color: T.red,
    icon: <Smartphone size={24} />,
    title: 'Voice Scams (Vishing)',
    difficulty: 'medium',
    xp: 100,
    content: 'Vishing (voice phishing) is the fraudulent practice of making phone calls or leaving voice messages purporting to be from reputable companies in order to induce individuals to reveal personal information.',
    flags: ["Unsolicited calls", "Request for OTP or PIN", "Spoofed caller ID"],
    quiz: {
      q: 'What should you do if a "support agent" on the phone asks for the 6-digit code sent to your phone?',
      opts: [
        'Read the code to verify identity',
        'Hang up immediately',
        'Ask to securely verify'
      ],
      ans: 1,
      explain: 'An OTP is for YOUR eyes only. Legitimate organizations will never ask you to provide an OTP over the phone.'
    }
  },
  {
    id: 'smishing',
    color: '#ffb700',
    icon: <ShieldAlert size={24} />,
    title: 'SMS Fraud (Smishing)',
    difficulty: 'hard',
    xp: 150,
    content: 'Smishing is a form of phishing that involves a text message. Scammers often use a compelling narrative to encourage the victim to click on a link or call a phone number.',
    flags: ["Unexpected delivery alerts", "Links shortening services", "Typosquatting URLs"],
    quiz: {
      q: 'You receive a text: "Your package is delayed. Click here to reschedule: http://amaz0n-delivery.com". Is this safe?',
      opts: [
        'Yes, it is a standard tracking link',
        'No, the domain is suspicious',
        'Maybe, if I use a VPN'
      ],
      ans: 1,
      explain: 'Look closely at the URL. Scammers use typos (amaz0n instead of amazon) and unsecured HTTP connections.'
    }
  }
]

const DiffBadge = ({ d }: { d: string }) => {
  const c = d === 'easy' ? T.green : d === 'medium' ? '#ffb700' : T.red
  return (
    <span style={{ padding: '4px 8px', fontSize: 11, background: `${c}15`, color: c, borderRadius: 4, border: `1px solid ${c}40`, textTransform: 'uppercase', fontWeight: 700 }}>
      {d}
    </span>
  )
}

const XPBadge = ({ xp }: { xp: number }) => (
  <span style={{ padding: '4px 8px', fontSize: 11, background: `${T.cyan}15`, color: T.cyan, borderRadius: 4, border: `1px solid ${T.cyan}40`, fontWeight: 700 }}>
    +{xp} XP
  </span>
)

const Tag = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{ padding: '4px 8px', fontSize: 11, background: `${color}15`, color: color, borderRadius: 4, border: `1px solid ${color}40`, fontWeight: 700 }}>
    {children}
  </span>
)

// ─── Module Detail View ───────────────────────────────────────────────────────
function ModuleDetail({
  mod,
  isCompleted,
  onBack,
  onComplete,
}: {
  mod: typeof MODULES[0]
  isCompleted: boolean
  onBack: () => void
  onComplete: (id: string, xp: number) => void
}) {
  const [answered, setAnswered] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)

  const handleQuiz = (idx: number) => {
    if (answered) return
    setAnswered(true)
    setSelected(idx)
    if (idx === mod.quiz.ans && !isCompleted) {
      onComplete(mod.id, mod.xp)
    }
  }

  return (
    <div style={{ padding: '80px 24px 60px', maxWidth: 680, margin: '0 auto', minHeight: '80vh' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: T.mid,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 28,
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          padding: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={e => (e.currentTarget.style.color = T.mid)}
      >
        ← Back to Modules
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
        <div style={{ padding: 12, background: `${mod.color}15`, borderRadius: 10, color: mod.color }}>
          {mod.icon}
        </div>
        <div>
          <h2 className="syne" style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: '1px', margin: 0 }}>
            {mod.title}
          </h2>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <DiffBadge d={mod.difficulty} />
            <XPBadge xp={mod.xp} />
            {isCompleted && <Tag color={T.green}>✓ Completed</Tag>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 22, marginTop: 22, marginBottom: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <p style={{ color: '#ddd', lineHeight: 1.78, fontSize: 15, margin: 0 }}>{mod.content}</p>
      </div>

      {/* Red flags */}
      <div style={{ padding: 22, marginBottom: 22, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <div className="mono" style={{ fontSize: 11, color: T.dim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14, fontFamily: 'var(--font-mono)' }}>
          ⚠ Red Flags to Watch
        </div>
        {mod.flags.map((f, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '9px 0',
              borderBottom: i < mod.flags.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}
          >
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.red, flexShrink: 0, marginTop: 8 }} />
            <span style={{ color: '#ccc', fontSize: 14, lineHeight: 1.5 }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Quiz */}
      <div style={{ padding: 22, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <div className="mono" style={{ fontSize: 11, color: T.cyan, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>
          ⚡ Knowledge Check
        </div>
        <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 18, lineHeight: 1.5, color: '#fff', margin: '0 0 18px' }}>
          {mod.quiz.q}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {mod.quiz.opts.map((opt, i) => {
            let bg = 'rgba(255,255,255,0.025)'
            let border = 'rgba(255,255,255,0.07)'
            let col = '#ccc'
            if (answered) {
              if (i === mod.quiz.ans)          { bg = `${T.green}15`; border = T.green; col = T.green }
              else if (i === selected)          { bg = `${T.red}15`;   border = T.red;   col = T.red   }
              else                              { col = T.dim }
            }
            return (
              <button
                key={i}
                onClick={() => handleQuiz(i)}
                disabled={answered}
                style={{
                  padding: '13px 16px',
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 9,
                  color: col,
                  textAlign: 'left',
                  cursor: answered ? 'default' : 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.18s',
                  fontWeight: 600,
                  width: '100%',
                }}
                onMouseEnter={e => { if (!answered) e.currentTarget.style.borderColor = T.cyan }}
                onMouseLeave={e => { if (!answered) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
              >
                {answered && i === mod.quiz.ans && <CheckCircle2 size={18} />}
                {answered && i === selected && i !== mod.quiz.ans && <XCircle size={18} />}
                {opt}
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        {answered && (
          <div style={{ marginTop: 16, padding: 16, background: `${T.cyan}08`, border: `1px solid ${T.cyan}33`, borderRadius: 8 }}>
            <div className="mono" style={{ fontSize: 11, color: T.cyan, marginBottom: 6, fontFamily: 'var(--font-mono)' }}>INTEL:</div>
            <p style={{ fontSize: 14, color: '#ddd', lineHeight: 1.65, margin: 0 }}>{mod.quiz.explain}</p>
            {selected === mod.quiz.ans
              ? <div style={{ marginTop: 10, color: T.green, fontWeight: 700, fontSize: 14 }}>🎉 +{mod.xp} XP earned!</div>
              : <div style={{ marginTop: 10, color: T.red, fontWeight: 700, fontSize: 14 }}>✗ Incorrect — review the material and try again next time.</div>
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Module List View ─────────────────────────────────────────────────────────
function ModuleList({
  completedModules,
  onOpen,
}: {
  completedModules: string[]
  onOpen: (id: string) => void
}) {
  return (
    <div style={{ padding: '80px 24px 60px', maxWidth: 840, margin: '0 auto', minHeight: '80vh' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 className="syne" style={{ fontSize: 'clamp(32px,6vw,48px)', fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>
          Knowledge <span style={{ color: T.red }}>Database</span>
        </h2>
        <p style={{ color: T.mid, marginTop: 6, fontSize: 15 }}>
          {completedModules.length}/{MODULES.length} modules completed
        </p>
        <div style={{ marginTop: 10, maxWidth: 240, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${(completedModules.length / MODULES.length) * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg,${T.red},${T.purple})`,
            transition: 'width 0.5s ease-out',
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {MODULES.map((mod, i) => (
          <div
            key={mod.id}
            onClick={() => onOpen(mod.id)}
            style={{
              padding: 28,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              transition: 'transform 0.2s, border-color 0.2s',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              animationDelay: `${i * 0.07}s`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.borderColor = mod.color + '66'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            {/* Glow orb */}
            <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, background: `${mod.color}10`, borderRadius: '50%', filter: 'blur(10px)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ padding: 14, background: `${mod.color}15`, borderRadius: 10, color: mod.color }}>{mod.icon}</div>
                <div>
                  <div className="syne" style={{ fontWeight: 800, fontSize: 20, marginBottom: 8, fontFamily: 'var(--font-head)', letterSpacing: '1px' }}>{mod.title}</div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    <DiffBadge d={mod.difficulty} />
                    <XPBadge xp={mod.xp} />
                    {completedModules.includes(mod.id) && <Tag color={T.green}>✓ Done</Tag>}
                  </div>
                </div>
              </div>
              <div style={{ color: T.cyan, display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600 }}>
                Open <ChevronRight size={18} />
              </div>
            </div>

            <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.65, marginTop: 16, position: 'relative', zIndex: 1, maxWidth: '90%' }}>
              {mod.content}
            </p>

            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
              {mod.flags.slice(0, 3).map((f, fi) => (
                <span key={fi} style={{ fontSize: 12, padding: '4px 10px', background: `${T.red}10`, color: T.red, border: `1px solid ${T.red}33`, borderRadius: 6, fontFamily: 'var(--font-body)' }}>
                  ⚠ {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const [completed, setCompleted]   = useState<string[]>([])
  const [totalXp, setTotalXp]       = useState(0)
  const [activeId, setActiveId]     = useState<string | null>(null)

  const handleComplete = (id: string, xp: number) => {
    if (!completed.includes(id)) {
      setCompleted(prev => [...prev, id])
      setTotalXp(prev => prev + xp)
    }
  }

  const activeMod = MODULES.find(m => m.id === activeId)

  return (
    <>
      <CursorEffect />
      <Navbar />
      <main style={{ position: 'relative', zIndex: 10 }}>
        {activeMod ? (
          <ModuleDetail
            key={activeMod.id}
            mod={activeMod}
            isCompleted={completed.includes(activeMod.id)}
            onBack={() => setActiveId(null)}
            onComplete={handleComplete}
          />
        ) : (
          <ModuleList
            completedModules={completed}
            onOpen={id => setActiveId(id)}
          />
        )}
      </main>
      <Footer />
    </>
  )
}