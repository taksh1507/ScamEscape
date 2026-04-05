'use client'

import { useState, useEffect, useRef } from 'react'
import {
  CheckCircle2, XCircle, ChevronRight, ShieldAlert, MailWarning,
  Smartphone, Trophy, Zap, Target, Lock, Users, BarChart2,
  Flame, Star, ArrowLeft, Clock, Shield
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CursorEffect from '@/components/ui/CursorEffect'

// ─── Theme tokens ────────────────────────────────────────────────────────────
const T = {
  mid: '#7070a0',
  green: '#00e676',
  red: '#ff1744',
  cyan: '#00e5ff',
  amber: '#ffb700',
  purple: '#f50057',
  dim: '#555570',
  muted: '#888',
}

// ─── XP thresholds per level ─────────────────────────────────────────────────
const LEVELS = [
  { lvl: 1, label: 'Recruit',    min: 0   },
  { lvl: 2, label: 'Analyst',    min: 100 },
  { lvl: 3, label: 'Sentinel',   min: 250 },
  { lvl: 4, label: 'Guardian',   min: 500 },
  { lvl: 5, label: 'Elite',      min: 900 },
]

function getLevelInfo(xp: number) {
  let current = LEVELS[0]
  let next = LEVELS[1]
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) { current = LEVELS[i]; next = LEVELS[i + 1] ?? null }
  }
  const progress = next
    ? ((xp - current.min) / (next.min - current.min)) * 100
    : 100
  return { current, next, progress }
}

// ─── Module definitions ───────────────────────────────────────────────────────
const MODULES = [
  {
    id: 'phish',
    color: T.cyan,
    icon: <MailWarning size={22} />,
    title: 'Phishing Defense',
    difficulty: 'easy',
    xp: 50,
    unlockAt: 0,
    content: 'Phishing is a cyber attack that uses disguised email as a weapon. The goal is to trick the email recipient into believing that the message is something they want or need — to click a malicious link, enter credentials, or download malware.',
    flags: [
      'Generic greetings like "Dear Customer"',
      'Suspicious or misspelled sender address',
      'Urgency or threats ("Act now or your account will be suspended")',
      'Links that hover-reveal mismatched domains',
    ],
    tips: 'Always hover over links before clicking. Check the actual sender address, not just the display name. When in doubt, go directly to the website rather than clicking.',
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
    icon: <Smartphone size={22} />,
    title: 'Voice Scams (Vishing)',
    difficulty: 'medium',
    xp: 100,
    unlockAt: 50,
    content: 'Vishing (voice phishing) is the fraudulent practice of making phone calls or leaving voice messages purporting to be from reputable companies in order to induce individuals to reveal personal information, banking details, or one-time passwords.',
    flags: [
      'Unsolicited calls from "support" or "government agencies"',
      'Request for OTP, PIN, or password over phone',
      'Spoofed caller ID mimicking real organizations',
      'Creating panic: "Your account has been compromised"',
    ],
    tips: 'Hang up and call the organization back using the number on their official website. Never provide OTPs, PINs, or passwords over the phone — ever.',
    quiz: {
      q: 'What should you do if a "support agent" on the phone asks for the 6-digit code sent to your phone?',
      opts: [
        'Read the code to verify identity',
        'Hang up immediately',
        'Ask for their employee ID first'
      ],
      ans: 1,
      explain: 'An OTP is for YOUR eyes only. Legitimate organizations will never ask you to provide an OTP over the phone — it defeats the entire purpose of two-factor authentication.'
    }
  },
  {
    id: 'smishing',
    color: T.amber,
    icon: <ShieldAlert size={22} />,
    title: 'SMS Fraud (Smishing)',
    difficulty: 'hard',
    xp: 150,
    unlockAt: 100,
    content: 'Smishing is a form of phishing that involves a text message. Scammers often use a compelling narrative — fake package deliveries, bank alerts, or prize notifications — to encourage the victim to click on a link or call a phone number.',
    flags: [
      'Unexpected delivery alerts with suspicious links',
      'Links using URL shorteners to hide destination',
      'Typosquatting URLs (amaz0n, paypa1, g00gle)',
      'Unsolicited prize or reward notifications',
    ],
    tips: 'Never click links in unexpected SMS messages. Type URLs manually. Enable SMS filtering on your device. If it sounds too urgent or too good to be true, it is.',
    quiz: {
      q: 'You receive: "Your package is delayed. Reschedule: http://amaz0n-delivery.com". Is this safe?',
      opts: [
        'Yes, it is a standard tracking link',
        'No, the domain is suspicious',
        'Maybe, if I use a VPN'
      ],
      ans: 1,
      explain: 'Look closely at the URL. Scammers use typos (amaz0n instead of amazon) and unsecured HTTP connections. A VPN does nothing to protect you from visiting a fraudulent website.'
    }
  },
  {
    id: 'passwords',
    color: T.green,
    icon: <Lock size={22} />,
    title: 'Password Security',
    difficulty: 'medium',
    xp: 120,
    unlockAt: 150,
    content: 'Weak or reused passwords are the leading cause of account takeovers. Attackers use credential stuffing — testing breached username/password pairs across thousands of sites automatically — making password reuse catastrophic.',
    flags: [
      'Using the same password across multiple sites',
      'Passwords under 12 characters',
      'Personal info: birthdays, names, pet names',
      'Common substitutions: p@ssw0rd, S3cur1ty',
    ],
    tips: 'Use a password manager to generate and store unique 20+ character passwords. Enable two-factor authentication everywhere. Check haveibeenpwned.com to see if your credentials have been breached.',
    quiz: {
      q: 'Which is the strongest password strategy?',
      opts: [
        'A complex 8-character password: P@$$w0rd!',
        'A random 20-character passphrase from a password manager',
        'Your favourite phrase with some letter substitutions',
      ],
      ans: 1,
      explain: 'Length beats complexity every time. A random 20-character string from a password manager is practically uncrackable, while common substitutions like @ for "a" are well-known to attackers.'
    }
  },
  {
    id: 'social',
    color: '#b26cff',
    icon: <Users size={22} />,
    title: 'Social Engineering',
    difficulty: 'hard',
    xp: 200,
    unlockAt: 250,
    content: 'Social engineering is the psychological manipulation of people into performing actions or divulging confidential information. Unlike technical hacking, it exploits human trust and emotion — making it the most effective attack vector today.',
    flags: [
      'Pretexting: fabricated scenarios to gain trust',
      'Impersonating authority figures (IT, management, government)',
      'Quid pro quo: offering help in exchange for access',
      'Tailgating: following someone into a secure area',
    ],
    tips: 'Verify identities through official channels before acting. Be suspicious of unexpected requests, even from "known" contacts. Your company will never ask for credentials via email or phone.',
    quiz: {
      q: 'A caller says they\'re from IT and need your password to fix a "critical" server issue. What do you do?',
      opts: [
        'Provide the password since it is an emergency',
        'Refuse — IT should never need your password',
        'Change your password after giving them the old one'
      ],
      ans: 1,
      explain: 'Legitimate IT departments never need your password — they have administrative access. This is a classic pretexting attack. Always refuse and report the call to your security team.'
    }
  },
]

// ─── Scenario simulations ─────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 's1',
    title: 'Suspicious Email',
    xp: 75,
    preview: 'You receive an urgent email from your bank...',
    email: {
      from: 'security@secure-bankofamerica-alert.com',
      to: 'you@email.com',
      subject: 'URGENT: Your account has been locked',
      body: `Dear Customer,

We have detected suspicious activity on your Bank of America account. Your account has been temporarily limited.

To restore full access, please verify your information immediately by clicking the button below. Failure to verify within 24 hours will result in permanent account suspension.

[VERIFY YOUR ACCOUNT NOW]

Bank of America Security Team
© 2024 Bank of America Corporation`,
      clues: [
        { id: 'sender',  label: 'Sender address',  text: 'secure-bankofamerica-alert.com',   evil: true,  tip: 'The domain is not bankofamerica.com — it\'s a lookalike domain designed to deceive.' },
        { id: 'greet',   label: 'Greeting',         text: '"Dear Customer"',                  evil: true,  tip: 'Your bank knows your name. Generic greetings are a hallmark of mass phishing.' },
        { id: 'urgency', label: 'Urgency threat',   text: '"24 hours" / "permanent suspension"', evil: true, tip: 'Creating artificial urgency is a manipulation tactic to bypass critical thinking.' },
        { id: 'button',  label: 'Call-to-action',   text: 'VERIFY YOUR ACCOUNT NOW',          evil: true,  tip: 'Legitimate banks direct you to visit their website directly, not click email buttons.' },
        { id: 'footer',  label: 'Copyright footer', text: '© 2024 Bank of America Corporation', evil: false, tip: 'Real copyright footers do appear in legitimate emails — this alone proves nothing.' },
      ]
    }
  },
  {
    id: 's2',
    title: 'Phone Scam Call',
    xp: 100,
    preview: 'Your phone rings — it\'s "Apple Support"...',
    call: {
      callerId: 'Apple Support  +1 (800) 275-2273',
      script: [
        { speaker: 'Them', text: 'Hello, this is Michael from Apple Support. We\'ve detected your iCloud account has been accessed from Russia and 2.3 GB of personal data is being downloaded right now.' },
        { speaker: 'You', text: 'Oh no — what do I do?' },
        { speaker: 'Them', text: 'Stay calm. I can help you stop it immediately. I just need to verify your identity — please provide the 6-digit verification code that will be sent to your phone right now.' },
        { speaker: 'You', text: '... I got a code. It says "Do not share this with anyone."' },
        { speaker: 'Them', text: 'That message is automated — our certified support agents are authorized to receive it. This is urgent, every second counts.' },
      ],
      clues: [
        { id: 'spoofed', label: 'Caller ID',         evil: true,  tip: 'Caller ID can be trivially spoofed. A legitimate-looking number proves nothing.' },
        { id: 'panic',   label: 'Creating panic',    evil: true,  tip: '"2.3 GB being downloaded right now" is designed to bypass rational thinking through fear.' },
        { id: 'otp',     label: 'Requesting OTP',    evil: true,  tip: 'Apple will NEVER ask for your OTP over the phone. This is the single biggest red flag possible.' },
        { id: 'urgency', label: 'Time pressure',     evil: true,  tip: '"Every second counts" is classic social engineering — it prevents you from thinking clearly.' },
        { id: 'auth',    label: '"Authorized agents"', evil: true, tip: 'Claiming authority to override warnings is a manipulation tactic, not a real policy.' },
      ]
    }
  },
]

// ─── Utility components ───────────────────────────────────────────────────────
const DiffBadge = ({ d }: { d: string }) => {
  const c = d === 'easy' ? T.green : d === 'medium' ? T.amber : T.red
  return (
    <span style={{ padding: '3px 8px', fontSize: 10, background: `${c}15`, color: c, borderRadius: 4, border: `1px solid ${c}40`, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
      {d}
    </span>
  )
}

const XPBadge = ({ xp }: { xp: number }) => (
  <span style={{ padding: '3px 8px', fontSize: 10, background: `${T.cyan}15`, color: T.cyan, borderRadius: 4, border: `1px solid ${T.cyan}40`, fontWeight: 700, letterSpacing: '0.06em' }}>
    +{xp} XP
  </span>
)

const Tag = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span style={{ padding: '3px 8px', fontSize: 10, background: `${color}15`, color, borderRadius: 4, border: `1px solid ${color}40`, fontWeight: 700 }}>
    {children}
  </span>
)

const card: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
}

// ─── Stats Dashboard ──────────────────────────────────────────────────────────
const Dashboard = ({ totalXp, completedModules, completedScenarios, accuracy, streak }: any) => {
  const { current, next, progress } = getLevelInfo(totalXp)
  const stats = [
    { label: 'Total XP',       value: totalXp,                   color: T.cyan,   icon: <Zap size={16}/> },
    { label: 'Modules Done',   value: `${completedModules.length}/${MODULES.length}`, color: T.green, icon: <Target size={16}/> },
    { label: 'Drills Done',    value: `${completedScenarios.length}/${SCENARIOS.length}`, color: T.amber, icon: <Shield size={16}/> },
    { label: 'Accuracy',       value: `${accuracy}%`,            color: '#b26cff', icon: <BarChart2 size={16}/> },
  ]
  return (
    <div style={{ padding: '80px 24px 0', maxWidth: 840, margin: '0 auto' }}>
      {/* Level card */}
      <div style={{ ...card, padding: 28, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, background: `${T.cyan}08`, borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, background: `${T.cyan}15`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.cyan}40`, flexShrink: 0 }}>
            <Trophy size={24} color={T.cyan} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Current Rank</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: 1, color: T.cyan }}>{current.label}</span>
              <span style={{ fontSize: 13, color: T.mid }}>Level {current.lvl}</span>
            </div>
          </div>
          {streak > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: `${T.amber}15`, border: `1px solid ${T.amber}40`, borderRadius: 8, padding: '8px 14px' }}>
              <Flame size={18} color={T.amber} />
              <span style={{ color: T.amber, fontWeight: 700, fontSize: 18 }}>{streak}</span>
              <span style={{ color: T.amber, fontSize: 12, opacity: 0.8 }}>streak</span>
            </div>
          )}
        </div>
        {next && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: T.mid }}>Progress to {next.label}</span>
              <span style={{ fontSize: 12, color: T.cyan, fontWeight: 600 }}>{totalXp} / {next.min} XP</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: `linear-gradient(90deg,${T.cyan},${T.purple})`, borderRadius: 4, transition: 'width 0.6s ease-out' }} />
            </div>
          </>
        )}
        {!next && <div style={{ color: T.green, fontWeight: 600, fontSize: 14 }}>🎖 Max Rank Achieved!</div>}
      </div>
      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...card, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: s.color, opacity: 0.85 }}>
              {s.icon}
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-head)', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      {/* Next unlocks */}
      <div style={{ ...card, padding: '20px 24px', marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 14 }}>Unlock Path</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MODULES.map(m => {
            const done = completedModules.includes(m.id)
            const locked = totalXp < m.unlockAt
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: done ? `${T.green}20` : locked ? 'rgba(255,255,255,0.04)' : `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${done ? T.green : locked ? 'rgba(255,255,255,0.06)' : m.color}40`, color: done ? T.green : locked ? T.dim : m.color, flexShrink: 0 }}>
                  {done ? <CheckCircle2 size={14} /> : locked ? <Lock size={12} /> : <Star size={12} />}
                </div>
                <span style={{ fontSize: 13, color: done ? '#ccc' : locked ? T.dim : '#ddd', flex: 1, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1 }}>{m.title}</span>
                {locked && <span style={{ fontSize: 11, color: T.amber, fontFamily: 'var(--font-mono)' }}>{m.unlockAt} XP</span>}
                {done && <Tag color={T.green}>✓</Tag>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Module detail view ───────────────────────────────────────────────────────
const ModuleDetail = ({ mod, nextMod, completed, onComplete, updateXP, onBack, onNext }: any) => {
  const [quiz, setQuiz] = useState({ answered: false, selected: null as number | null })

  const isCorrect = quiz.answered && quiz.selected === mod.quiz.ans

  const handleQuiz = (idx: number) => {
    if (quiz.answered) return
    setQuiz({ answered: true, selected: idx })
    if (idx === mod.quiz.ans && !completed) { onComplete(mod.id); updateXP(mod.xp) }
  }

  const handleTryAgain = () => setQuiz({ answered: false, selected: null })

  return (
    <div style={{ padding: '80px 24px 60px', maxWidth: 680, margin: '0 auto', minHeight: '80vh', position: 'relative', zIndex: 1 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.mid, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, fontFamily: 'var(--font-body)', fontSize: 14 }}>
        <ArrowLeft size={16} /> Back
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
        <div style={{ padding: 12, background: `${mod.color}15`, borderRadius: 10, color: mod.color }}>{mod.icon}</div>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: 1, margin: 0 }}>{mod.title}</h2>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <DiffBadge d={mod.difficulty} /><XPBadge xp={mod.xp} />
            {completed && <Tag color={T.green}>✓ Completed</Tag>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ ...card, padding: 22, marginTop: 22, marginBottom: 14 }}>
        <p style={{ color: '#ddd', lineHeight: 1.78, fontSize: 15, margin: 0 }}>{mod.content}</p>
      </div>

      {/* Red flags */}
      <div style={{ ...card, padding: 22, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: T.dim, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14, fontFamily: 'var(--font-mono)' }}>⚠ Red Flags to Watch</div>
        {mod.flags.map((f: string, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: i < mod.flags.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.red, flexShrink: 0, marginTop: 8 }} />
            <span style={{ color: '#ccc', fontSize: 14, lineHeight: 1.5 }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Pro tip */}
      <div style={{ ...card, padding: 20, marginBottom: 14, borderLeft: `3px solid ${mod.color}`, borderRadius: '0 12px 12px 0' }}>
        <div style={{ fontSize: 11, color: mod.color, marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>💡 Pro Tip</div>
        <p style={{ fontSize: 14, color: '#ccc', lineHeight: 1.65, margin: 0 }}>{mod.tips}</p>
      </div>

      {/* Quiz */}
      <div style={{ ...card, padding: 22, position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 11, color: T.cyan, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>⚡ Knowledge Check</div>
        <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 18, lineHeight: 1.5, color: '#fff' }}>{mod.quiz.q}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {mod.quiz.opts.map((opt: string, i: number) => {
            let bg = 'rgba(255,255,255,0.025)', border = 'rgba(255,255,255,0.07)', col = '#ccc'
            if (quiz.answered) {
              if (i === mod.quiz.ans) { bg = `${T.green}15`; border = T.green; col = T.green }
              else if (i === quiz.selected) { bg = `${T.red}15`; border = T.red; col = T.red }
              else { col = T.dim }
            }
            return (
              <button key={i} onClick={() => handleQuiz(i)} style={{ padding: '13px 16px', background: bg, border: `1px solid ${border}`, borderRadius: 9, color: col, textAlign: 'left', cursor: quiz.answered ? 'default' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 15, display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.18s', fontWeight: 500 }}>
                {quiz.answered && i === mod.quiz.ans && <CheckCircle2 size={18} />}
                {quiz.answered && i === quiz.selected && i !== mod.quiz.ans && <XCircle size={18} />}
                {opt}
              </button>
            )
          })}
        </div>

        {/* Result feedback */}
        {quiz.answered && (
          <div style={{ marginTop: 16, padding: 16, background: isCorrect ? `${T.green}08` : `${T.red}08`, border: `1px solid ${isCorrect ? T.green : T.red}33`, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: isCorrect ? T.green : T.red, marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
              {isCorrect ? '✓ CORRECT' : '✗ INCORRECT'}
            </div>
            <p style={{ fontSize: 14, color: '#ddd', lineHeight: 1.65, margin: 0 }}>{mod.quiz.explain}</p>
            {isCorrect && !completed && (
              <div style={{ marginTop: 8, color: T.green, fontWeight: 600, fontSize: 14 }}>+{mod.xp} XP earned!</div>
            )}
          </div>
        )}

        {/* Post-answer actions */}
        {quiz.answered && (
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {isCorrect ? (
              <>
                {nextMod ? (
                  <button onClick={() => onNext(nextMod)} style={{ flex: 1, padding: '13px 20px', background: `${T.green}18`, border: `1px solid ${T.green}60`, borderRadius: 10, color: T.green, fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.04em', transition: 'all 0.18s' }}>
                    Next Module: {nextMod.title} <ChevronRight size={17} />
                  </button>
                ) : (
                  <button onClick={onBack} style={{ flex: 1, padding: '13px 20px', background: `${T.cyan}15`, border: `1px solid ${T.cyan}40`, borderRadius: 10, color: T.cyan, fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.04em', transition: 'all 0.18s' }}>
                    All modules complete! Back to list <ChevronRight size={17} />
                  </button>
                )}
              </>
            ) : (
              <>
                <button onClick={handleTryAgain} style={{ flex: 1, padding: '13px 20px', background: `${T.amber}15`, border: `1px solid ${T.amber}50`, borderRadius: 10, color: T.amber, fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.04em', transition: 'all 0.18s' }}>
                  ↺ Try Again
                </button>
                <button onClick={onBack} style={{ padding: '13px 18px', background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: T.mid, fontFamily: 'var(--font-head)', fontSize: 14, cursor: 'pointer', transition: 'all 0.18s' }}>
                  Back to list
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Scenario drill ───────────────────────────────────────────────────────────
const ScenarioDrill = ({ scenario, completed, onComplete, updateXP, onBack }: any) => {
  const [found, setFound] = useState<string[]>([])
  const [revealed, setRevealed] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const isEmail = !!scenario.email
  const clues = isEmail ? scenario.email.clues : scenario.call.clues
  const evilClues = clues.filter((c: any) => c.evil)
  const score = found.filter(id => clues.find((c: any) => c.id === id && c.evil)).length
  const total = evilClues.length

  const toggle = (id: string) => {
    if (submitted) { setRevealed(revealed === id ? null : id); return }
    setFound(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    setRevealed(id)
  }

  const handleSubmit = () => {
    setSubmitted(true)
    if (!completed) { onComplete(scenario.id); updateXP(Math.round(scenario.xp * (score / total))) }
  }

  const earnedXp = Math.round(scenario.xp * (score / total))

  return (
    <div style={{ padding: '80px 24px 60px', maxWidth: 720, margin: '0 auto', minHeight: '80vh' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.mid, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontFamily: 'var(--font-body)', fontSize: 14 }}>
        <ArrowLeft size={16} /> Back to Drills
      </button>

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: 1, marginBottom: 6 }}>{scenario.title}</h2>
        <p style={{ color: T.mid, fontSize: 14, margin: 0 }}>Click on suspicious elements you can identify. Find all red flags to earn full XP.</p>
      </div>

      {/* Progress bar */}
      {!submitted && (
        <div style={{ ...card, padding: '14px 20px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: T.mid, flexShrink: 0 }}>Red flags found:</span>
          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(score / total) * 100}%`, background: T.red, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 13, color: T.red, fontWeight: 600, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{score}/{total}</span>
        </div>
      )}

      {/* Email simulation */}
      {isEmail && (
        <div style={{ ...card, overflow: 'hidden', marginBottom: 18 }}>
          <div style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ color: T.dim }}>From:</span>
            <button onClick={() => toggle('sender')} style={{ background: found.includes('sender') ? `${T.red}20` : 'none', border: found.includes('sender') ? `1px solid ${T.red}60` : '1px solid transparent', borderRadius: 4, padding: '2px 6px', color: submitted ? (clues.find((c: any) => c.id === 'sender')?.evil ? T.red : T.green) : found.includes('sender') ? T.red : '#ccc', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12, transition: 'all 0.15s' }}>
              {scenario.email.from}
            </button>
          </div>
          <div style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 12, display: 'flex', gap: 16 }}>
            <span style={{ color: T.dim }}>Subject:</span>
            <span style={{ color: '#ddd', fontWeight: 600 }}>{scenario.email.subject}</span>
          </div>
          <div style={{ padding: 24 }}>
            {scenario.email.body.split('\n').map((line: string, i: number) => {
              if (line.includes('Dear Customer')) return (
                <p key={i}>
                  <button onClick={() => toggle('greet')} style={{ background: found.includes('greet') ? `${T.red}20` : 'none', border: found.includes('greet') ? `1px solid ${T.red}60` : '1px dashed rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 6px', color: submitted ? T.red : found.includes('greet') ? T.red : '#ccc', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, transition: 'all 0.15s' }}>{line}</button>
                </p>
              )
              if (line.includes('24 hours') || line.includes('permanent')) return (
                <p key={i} style={{ color: '#bbb', fontSize: 14, lineHeight: 1.7 }}>
                  To restore full access, please verify your information immediately by clicking the button below.{' '}
                  <button onClick={() => toggle('urgency')} style={{ background: found.includes('urgency') ? `${T.red}20` : 'none', border: found.includes('urgency') ? `1px solid ${T.red}60` : '1px dashed rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 6px', color: submitted ? T.red : found.includes('urgency') ? T.red : '#ccc', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, transition: 'all 0.15s' }}>Failure to verify within 24 hours will result in permanent account suspension.</button>
                </p>
              )
              if (line.includes('VERIFY')) return (
                <div key={i} style={{ margin: '20px 0', textAlign: 'center' }}>
                  <button onClick={() => toggle('button')} style={{ padding: '12px 28px', background: found.includes('button') ? `${T.red}30` : '#1a3a5c', border: found.includes('button') ? `2px solid ${T.red}` : '2px solid #2563eb', borderRadius: 8, color: submitted ? T.red : found.includes('button') ? T.red : '#60a5fa', cursor: 'pointer', fontWeight: 700, fontSize: 14, transition: 'all 0.15s' }}>VERIFY YOUR ACCOUNT NOW</button>
                </div>
              )
              if (line.includes('© 2024')) return (
                <p key={i} style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <button onClick={() => toggle('footer')} style={{ background: found.includes('footer') ? `${T.green}15` : 'none', border: found.includes('footer') ? `1px solid ${T.green}60` : '1px dashed rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 6px', color: submitted ? T.green : found.includes('footer') ? T.green : T.dim, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, transition: 'all 0.15s' }}>{line}</button>
                </p>
              )
              if (!line.trim()) return <br key={i} />
              return <p key={i} style={{ color: '#bbb', fontSize: 14, lineHeight: 1.7, margin: '4px 0' }}>{line}</p>
            })}
          </div>
        </div>
      )}

      {/* Call simulation */}
      {!isEmail && (
        <div style={{ ...card, overflow: 'hidden', marginBottom: 18 }}>
          <div style={{ padding: '14px 20px', background: 'rgba(0,229,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: T.dim, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Incoming Call</div>
              <button onClick={() => toggle('spoofed')} style={{ background: found.includes('spoofed') ? `${T.red}20` : 'none', border: found.includes('spoofed') ? `1px solid ${T.red}60` : '1px dashed rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 10px', color: submitted ? T.red : found.includes('spoofed') ? T.red : '#ddd', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                {scenario.call.callerId}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${T.red}30`, border: `1px solid ${T.red}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✕</div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${T.green}20`, border: `1px solid ${T.green}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📞</div>
            </div>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {scenario.call.script.map((line: any, i: number) => {
              const isThem = line.speaker === 'Them'
              const hasPanic = line.text.includes('2.3 GB') || line.text.includes('Russia')
              const hasOtp = line.text.includes('6-digit') || line.text.includes('verification code')
              const hasUrgency = line.text.includes('every second') || line.text.includes('urgent')
              const hasAuth = line.text.includes('authorized')
              return (
                <div key={i} style={{ display: 'flex', gap: 10, justifyContent: isThem ? 'flex-start' : 'flex-end' }}>
                  <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: isThem ? '4px 12px 12px 12px' : '12px 4px 12px 12px', background: isThem ? 'rgba(255,255,255,0.06)' : 'rgba(0,229,255,0.08)', border: `1px solid ${isThem ? 'rgba(255,255,255,0.08)' : 'rgba(0,229,255,0.2)'}`, fontSize: 14, color: '#ddd', lineHeight: 1.6 }}>
                    <div style={{ fontSize: 10, color: isThem ? T.red : T.cyan, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 5, letterSpacing: '0.08em' }}>{line.speaker}</div>
                    {isThem ? (
                      <span>
                        {hasPanic && (
                          <button onClick={() => toggle('panic')} style={{ background: found.includes('panic') ? `${T.red}25` : 'none', border: found.includes('panic') ? `1px solid ${T.red}60` : '1px dashed rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 5px', color: submitted ? T.red : found.includes('panic') ? T.red : '#ccc', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                            Hello, this is Michael from Apple Support. We've detected your iCloud account has been accessed from Russia and 2.3 GB of personal data is being downloaded right now.
                          </button>
                        )}
                        {hasOtp && (
                          <>
                            Stay calm. I can help you stop it immediately. I just need to verify your identity — please provide the{' '}
                            <button onClick={() => toggle('otp')} style={{ background: found.includes('otp') ? `${T.red}25` : 'none', border: found.includes('otp') ? `1px solid ${T.red}60` : '1px dashed rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 5px', color: submitted ? T.red : found.includes('otp') ? T.red : T.amber, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600 }}>
                              6-digit verification code that will be sent to your phone right now.
                            </button>
                          </>
                        )}
                        {hasUrgency && (
                          <>
                            That message is automated — our certified support agents are{' '}
                            <button onClick={() => toggle('auth')} style={{ background: found.includes('auth') ? `${T.red}25` : 'none', border: found.includes('auth') ? `1px solid ${T.red}60` : '1px dashed rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 5px', color: submitted ? T.red : found.includes('auth') ? T.red : '#ccc', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                              authorized to receive it.
                            </button>{' '}
                            <button onClick={() => toggle('urgency')} style={{ background: found.includes('urgency') ? `${T.red}25` : 'none', border: found.includes('urgency') ? `1px solid ${T.red}60` : '1px dashed rgba(255,255,255,0.12)', borderRadius: 4, padding: '1px 5px', color: submitted ? T.red : found.includes('urgency') ? T.red : '#ccc', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                              This is urgent, every second counts.
                            </button>
                          </>
                        )}
                        {!hasPanic && !hasOtp && !hasUrgency && line.text}
                      </span>
                    ) : line.text}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tooltip */}
      {revealed && !submitted && (
        <div style={{ ...card, padding: 16, marginBottom: 16, borderLeft: `3px solid ${clues.find((c: any) => c.id === revealed)?.evil ? T.red : T.green}`, borderRadius: '0 12px 12px 0' }}>
          <div style={{ fontSize: 11, color: T.dim, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{clues.find((c: any) => c.id === revealed)?.label}</div>
          <p style={{ fontSize: 14, color: '#ccc', margin: 0, lineHeight: 1.65 }}>{clues.find((c: any) => c.id === revealed)?.tip}</p>
        </div>
      )}

      {/* Submit */}
      {!submitted ? (
        <button onClick={handleSubmit} style={{ width: '100%', padding: '14px 24px', background: `${T.cyan}15`, border: `1px solid ${T.cyan}40`, borderRadius: 10, color: T.cyan, fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.2s' }}>
          Submit Analysis ({score}/{total} red flags marked)
        </button>
      ) : (
        <div style={{ ...card, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 32 }}>{score === total ? '🎯' : score >= total / 2 ? '👍' : '📚'}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)', color: score === total ? T.green : score >= total / 2 ? T.amber : T.red }}>
                {score === total ? 'Perfect Score!' : score >= total / 2 ? 'Good Catch!' : 'Keep Practicing'}
              </div>
              <div style={{ fontSize: 13, color: T.mid, marginTop: 2 }}>{score}/{total} red flags identified • +{earnedXp} XP earned</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clues.map((c: any) => (
              <button key={c.id} onClick={() => setRevealed(revealed === c.id ? null : c.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: c.evil ? `${T.red}08` : `${T.green}08`, border: `1px solid ${c.evil ? T.red : T.green}30`, borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}>
                {found.includes(c.id) && c.evil ? <CheckCircle2 size={16} color={T.green} style={{ flexShrink: 0, marginTop: 1 }} /> : !found.includes(c.id) && c.evil ? <XCircle size={16} color={T.red} style={{ flexShrink: 0, marginTop: 1 }} /> : <CheckCircle2 size={16} color={T.green} style={{ flexShrink: 0, marginTop: 1 }} />}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.evil ? T.red : T.green, marginBottom: 2 }}>{c.label} {c.evil ? '— Red Flag' : '— Legitimate'}</div>
                  {revealed === c.id && <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>{c.tip}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Scenarios list ───────────────────────────────────────────────────────────
const ScenariosList = ({ completedScenarios, onSelect }: any) => (
  <div style={{ padding: '80px 24px 60px', maxWidth: 840, margin: '0 auto', minHeight: '80vh' }}>
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 'clamp(32px,6vw,48px)', fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
        Live <span style={{ color: T.amber }}>Drills</span>
      </h2>
      <p style={{ color: T.mid, fontSize: 15, margin: 0 }}>Realistic attack simulations — identify red flags before you get compromised.</p>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {SCENARIOS.map((s, i) => {
        const done = completedScenarios.includes(s.id)
        return (
          <div key={s.id} onClick={() => onSelect(s)} style={{ ...card, padding: 28, cursor: 'pointer', transition: 'transform 0.2s', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
            <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, background: `${T.amber}08`, borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ padding: 12, background: `${T.amber}15`, borderRadius: 10, color: T.amber, flexShrink: 0 }}>
                  {s.email ? <MailWarning size={22} /> : <Smartphone size={22} />}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 20, fontFamily: 'var(--font-head)', letterSpacing: 1, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <XPBadge xp={s.xp} />
                    {done && <Tag color={T.green}>✓ Completed</Tag>}
                    <Tag color={T.amber}>{s.email ? 'Email Drill' : 'Phone Drill'}</Tag>
                  </div>
                </div>
              </div>
              <div style={{ color: T.amber, display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                Start <ChevronRight size={18} />
              </div>
            </div>
            <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.65, marginTop: 16, maxWidth: '90%' }}>{s.preview}</p>
          </div>
        )
      })}
    </div>
  </div>
)

// ─── Module list ──────────────────────────────────────────────────────────────
const ModuleList = ({ completedModules, totalXp, onSelect }: any) => (
  <div style={{ padding: '80px 24px 60px', maxWidth: 840, margin: '0 auto', minHeight: '80vh' }}>
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 'clamp(32px,6vw,48px)', fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
        Knowledge <span style={{ color: T.red }}>Database</span>
      </h2>
      <p style={{ color: T.mid, fontSize: 15, margin: 0 }}>{completedModules.length}/{MODULES.length} modules completed</p>
      <div style={{ marginTop: 10, maxWidth: 240, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${(completedModules.length / MODULES.length) * 100}%`, height: '100%', background: `linear-gradient(90deg,${T.red},${T.purple})`, transition: 'width 0.5s ease-out' }} />
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {MODULES.map((mod, i) => {
        const locked = totalXp < mod.unlockAt
        const done = completedModules.includes(mod.id)
        return (
          <div key={mod.id} onClick={() => !locked && onSelect(mod)} style={{ ...card, padding: 28, cursor: locked ? 'not-allowed' : 'pointer', transition: 'transform 0.2s', position: 'relative', overflow: 'hidden', opacity: locked ? 0.55 : 1 }}
            onMouseEnter={e => !locked && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
            <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, background: `${mod.color}08`, borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ padding: 14, background: `${mod.color}15`, borderRadius: 10, color: locked ? T.dim : mod.color, position: 'relative' }}>
                  {locked ? <Lock size={22} /> : mod.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 20, fontFamily: 'var(--font-head)', letterSpacing: 1, marginBottom: 8 }}>{mod.title}</div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    <DiffBadge d={mod.difficulty} /><XPBadge xp={mod.xp} />
                    {done && <Tag color={T.green}>✓ Done</Tag>}
                    {locked && <Tag color={T.amber}>🔒 {mod.unlockAt} XP to unlock</Tag>}
                  </div>
                </div>
              </div>
              {!locked && <div style={{ color: T.cyan, display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600 }}>Open <ChevronRight size={18} /></div>}
            </div>
            <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.65, marginTop: 16, position: 'relative', zIndex: 1, maxWidth: '90%' }}>{mod.content.slice(0, 140)}...</p>
            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
              {mod.flags.slice(0, 3).map((f: string, fi: number) => (
                <span key={fi} style={{ fontSize: 12, padding: '4px 10px', background: `${T.red}10`, color: T.red, border: `1px solid ${T.red}33`, borderRadius: 6 }}>⚠ {f.split('(')[0].trim()}</span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  </div>
)

// ─── Nav tabs ─────────────────────────────────────────────────────────────────
type Tab = 'learn' | 'drills' | 'stats'

const TabBar = ({ active, onChange, totalXp, streak }: { active: Tab; onChange: (t: Tab) => void; totalXp: number; streak: number }) => {
  const { current } = getLevelInfo(totalXp)
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'learn',  label: 'Learn',  icon: <Target size={15} /> },
    { id: 'drills', label: 'Drills', icon: <ShieldAlert size={15} /> },
    { id: 'stats',  label: 'Stats',  icon: <BarChart2 size={15} /> },
  ]
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
      <div style={{ maxWidth: 840, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => onChange(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '14px 18px', background: 'none', border: 'none', borderBottom: `2px solid ${active === t.id ? T.red : 'transparent'}`, color: active === t.id ? '#fff' : T.mid, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: active === t.id ? 700 : 400, transition: 'all 0.15s', marginBottom: -1 }}>
            {t.icon} {t.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {streak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.amber, fontSize: 13, fontWeight: 600 }}>
              <Flame size={14} /> {streak}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: `${T.cyan}12`, border: `1px solid ${T.cyan}30`, borderRadius: 20 }}>
            <Zap size={12} color={T.cyan} />
            <span style={{ fontSize: 12, color: T.cyan, fontWeight: 700 }}>{totalXp} XP</span>
            <span style={{ fontSize: 11, color: T.dim }}>· {current.label}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Root page ────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const [tab, setTab] = useState<Tab>('learn')
  const [activeModule, setActiveModule] = useState<any>(null)
  const [activeScenario, setActiveScenario] = useState<any>(null)
  const [completedModules, setCompletedModules] = useState<string[]>([])
  const [completedScenarios, setCompletedScenarios] = useState<string[]>([])
  const [totalXp, setTotalXp] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [totalAnswers, setTotalAnswers] = useState(0)
  const [streak, setStreak] = useState(0)
  const [recentXp, setRecentXp] = useState<number | null>(null)
  const xpTimer = useRef<ReturnType<typeof setTimeout>>()

  const handleComplete = (id: string, type: 'module' | 'scenario' = 'module') => {
    if (type === 'module' && !completedModules.includes(id)) setCompletedModules(prev => [...prev, id])
    if (type === 'scenario' && !completedScenarios.includes(id)) setCompletedScenarios(prev => [...prev, id])
    setStreak(prev => prev + 1)
  }

  const handleUpdateXP = (xp: number, correct = true) => {
    if (xp > 0) {
      setTotalXp(prev => prev + xp)
      setRecentXp(xp)
      clearTimeout(xpTimer.current)
      xpTimer.current = setTimeout(() => setRecentXp(null), 2200)
    }
    setTotalAnswers(prev => prev + 1)
    if (correct) setCorrectAnswers(prev => prev + 1)
  }

  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 100

  const handleEnter = () => {}

  return (
    <>
      <CursorEffect />
      <Navbar onEnter={handleEnter} />

      {/* XP toast */}
      {recentXp !== null && (
        <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 9999, padding: '14px 22px', background: `${T.green}20`, border: `1px solid ${T.green}60`, borderRadius: 12, color: T.green, fontWeight: 800, fontSize: 18, fontFamily: 'var(--font-head)', display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none', animation: 'fadeSlideUp 0.3s ease-out' }}>
          <Zap size={20} /> +{recentXp} XP
        </div>
      )}

      <style>{`@keyframes fadeSlideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <TabBar active={tab} onChange={(t) => { setTab(t); setActiveModule(null); setActiveScenario(null) }} totalXp={totalXp} streak={streak} />

      {tab === 'learn' && !activeModule && (
        <ModuleList completedModules={completedModules} totalXp={totalXp} onSelect={setActiveModule} />
      )}
      {tab === 'learn' && activeModule && (
        <ModuleDetail
          key={activeModule.id}
          mod={activeModule}
          nextMod={(() => {
            const idx = MODULES.findIndex(m => m.id === activeModule.id)
            const next = MODULES[idx + 1]
            return next && totalXp >= next.unlockAt ? next : null
          })()}
          completed={completedModules.includes(activeModule.id)}
          onComplete={(id: string) => handleComplete(id, 'module')}
          updateXP={(xp: number) => handleUpdateXP(xp, true)}
          onBack={() => setActiveModule(null)}
          onNext={(next: any) => setActiveModule(next)}
        />
      )}

      {tab === 'drills' && !activeScenario && (
        <ScenariosList completedScenarios={completedScenarios} onSelect={setActiveScenario} />
      )}
      {tab === 'drills' && activeScenario && (
        <ScenarioDrill
          scenario={activeScenario}
          completed={completedScenarios.includes(activeScenario.id)}
          onComplete={(id: string) => handleComplete(id, 'scenario')}
          updateXP={(xp: number) => handleUpdateXP(xp, xp > 0)}
          onBack={() => setActiveScenario(null)}
        />
      )}

      {tab === 'stats' && (
        <Dashboard totalXp={totalXp} completedModules={completedModules} completedScenarios={completedScenarios} accuracy={accuracy} streak={streak} />
      )}

      <Footer />
    </>
  )
}
