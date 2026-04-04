'use client'

import { useState } from 'react'

interface QuizCardProps {
  moduleTitle: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export default function QuizCard({
  moduleTitle,
  question,
  options,
  correctIndex,
  explanation,
}: QuizCardProps) {
  const [selected, setSelected] = useState<number | null>(null)

  const isAnswered = selected !== null
  const isCorrect = selected === correctIndex

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Decorative cyber grid background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          opacity: 0.05,
          backgroundSize: '20px 20px',
          backgroundImage: 'linear-gradient(to right, var(--cyan) 1px, transparent 1px), linear-gradient(to bottom, var(--cyan) 1px, transparent 1px)',
          pointerEvents: 'none',
        }}
      />

      <h3
        style={{
          color: 'var(--cyan)',
          fontFamily: 'var(--font-head)',
          fontSize: '18px',
          letterSpacing: '2px',
          marginTop: 0,
          marginBottom: '8px',
          textTransform: 'uppercase',
        }}
      >
        {moduleTitle}
      </h3>

      <p
        style={{
          fontSize: '16px',
          fontWeight: 600,
          marginBottom: '20px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {question}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 1 }}>
        {options.map((opt, idx) => {
          let btnBg = 'var(--dark2)'
          let btnBorder = 'var(--border)'

          if (isAnswered) {
            if (idx === correctIndex) {
              btnBg = 'rgba(0, 229, 255, 0.1)'
              btnBorder = 'var(--cyan)'
            } else if (idx === selected) {
              btnBg = 'rgba(255, 23, 68, 0.1)'
              btnBorder = 'var(--red)'
            }
          }

          return (
            <button
              key={idx}
              onClick={() => !isAnswered && setSelected(idx)}
              disabled={isAnswered}
              style={{
                textAlign: 'left',
                padding: '14px 20px',
                borderRadius: '8px',
                background: btnBg,
                border: `1px solid ${btnBorder}`,
                color: '#fff',
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                cursor: isAnswered ? 'default' : 'pointer',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                if (!isAnswered) {
                  e.currentTarget.style.borderColor = 'var(--pink)'
                  e.currentTarget.style.background = 'rgba(255,23,68,0.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isAnswered) {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = 'var(--dark2)'
                }
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {isAnswered && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            borderRadius: '8px',
            background: isCorrect ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 23, 68, 0.1)',
            borderLeft: `4px solid ${isCorrect ? 'var(--cyan)' : 'var(--red)'}`,
            animation: 'fadeSlideDown 0.4s ease',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <h4
            style={{
              fontFamily: 'var(--font-head)',
              fontSize: '20px',
              margin: '0 0 8px 0',
              color: isCorrect ? 'var(--cyan)' : 'var(--red)',
              textTransform: 'uppercase',
            }}
          >
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </h4>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
            {explanation}
          </p>
        </div>
      )}
    </div>
  )
}
