import type { StatItem, FeatureItem, NavLink } from './types'

export const NAV_LINKS: NavLink[] = [
  { label: 'Rooms',       href: '#rooms' },
  { label: 'Simulate',   href: '#simulate' },
  { label: 'Leaderboard', href: '#' },
  { label: 'About',      href: '#' },
]

export const STATS: StatItem[] = [
  { id: 's1', target: 128, label: 'Agents Trained' },
  { id: 's2', target: 98,    label: 'Accuracy Rate %' },
  { id: 's3', target: 6,   label: 'Scenarios Built' },
  { id: 's4', target: 6,     label: 'Players Per Room' },
]

export const FEATURES: FeatureItem[] = [
  { icon: '🎭', title: 'Real Simulations',  desc: 'Chat, SMS & call-based scam scenarios pulled from real-world attack patterns' },
  { icon: '🤖', title: 'AI Feedback',       desc: 'GPT-powered analysis explains every mistake and red flag after each decision' },
  { icon: '⚡', title: 'Live Scoring',      desc: 'Real-time performance tracking with behavioral profile analysis' },
  { icon: '👥', title: '6-Player Rooms',    desc: 'Compete with others in shared simulation rooms — no login required' },
]

export const TICKER_ITEMS: string[] = [
  '⚠ PHISHING SIMULATION ACTIVE',
  '🔴 LIVE THREAT SCENARIOS',
  'AI-POWERED FEEDBACK ENGINE',
  'REAL-TIME RED FLAG DETECTION',
  'BEHAVIORAL ANALYSIS SYSTEM',
  'MULTI-LEVEL DIFFICULTY',
]

export const DIFFICULTY_OPTIONS = [
  { value: 'easy'   as const, label: 'EASY',   sub: 'Basic phishing attempts' },
  { value: 'medium' as const, label: 'MEDIUM', sub: 'Targeted social engineering' },
  { value: 'hard'   as const, label: 'HARD',   sub: 'Advanced persistent threats' },
]