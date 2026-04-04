import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        red: '#ff1744',
        pink: '#f50057',
        cyan: '#00e5ff',
        dark: '#050509',
        dark2: '#0a0a14',
        card: '#12121f',
        card2: '#1a1a2e',
        muted: '#7070a0',
      },
      fontFamily: {
        head: ['Bebas Neue', 'sans-serif'],
        body: ['Rajdhani', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
