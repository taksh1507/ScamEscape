'use client'

import { useState } from 'react'

export default function ScannerUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{ prob: number; flags: string[] } | null>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const simulateScan = () => {
    if (!file) return
    setScanning(true)
    
    // Simulate AI processing delay
    setTimeout(() => {
      setScanning(false)
      // Mock result (high probability of scam for demo purposes)
      setResult({
        prob: Math.floor(Math.random() * 20) + 75, // 75% to 95%
        flags: [
          'Sense of urgency detected ("immediate action required")',
          'Suspicious URL formatting (typosquatting on popular domain)',
          'Sender email does not match official organization domain'
        ]
      })
    }, 3000)
  }

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '40px',
      boxShadow: '0 0 30px rgba(0,0,0,0.5)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {scanning && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 229, 255, 0.05)',
          pointerEvents: 'none',
          zIndex: 10,
          border: '1px solid var(--cyan)',
          animation: 'pulse 1s infinite'
        }}>
          {/* Scanning line */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '4px',
            background: 'var(--cyan)',
            boxShadow: '0 0 20px var(--cyan)',
            animation: 'scrollLine 2s infinite linear'
          }} />
        </div>
      )}

      <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', color: '#fff', marginBottom: '8px' }}>
        AI <span style={{ color: 'var(--red)' }}>Threat Scanner</span>
      </h2>
      <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>
        Upload a screenshot of a suspicious email, SMS, or website. Our AI will extract the text and analyze it for common fraud patterns.
      </p>

      <div style={{
        border: '2px dashed var(--border)',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        background: 'var(--dark2)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.3s'
      }}>
        <input 
          type="file" 
          accept="image/*"
          onChange={handleUpload}
          disabled={scanning}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            opacity: 0,
            cursor: 'pointer'
          }}
        />
        
        {file ? (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <p style={{ color: 'var(--cyan)', fontWeight: 600 }}>{file.name}</p>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Click to change file</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📤</div>
            <p style={{ color: '#fff', fontWeight: 600 }}>Drag & drop or click to upload</p>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Supports JPG, PNG (Max 5MB)</p>
          </div>
        )}
      </div>

      <button
        onClick={simulateScan}
        disabled={!file || scanning}
        style={{
          marginTop: '24px',
          width: '100%',
          padding: '16px',
          background: (!file || scanning) ? 'var(--dark2)' : 'var(--red)',
          color: (!file || scanning) ? 'var(--muted)' : '#fff',
          border: 'none',
          fontFamily: 'var(--font-head)',
          fontSize: '24px',
          letterSpacing: '2px',
          cursor: (!file || scanning) ? 'default' : 'pointer',
          clipPath: 'polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%)',
          transition: 'all 0.3s'
        }}
      >
        {scanning ? 'Analyzing Data...' : 'Initiate Scan'}
      </button>

      {result && !scanning && (
        <div style={{ 
          marginTop: '32px', 
          animation: 'fadeSlideUp 0.5s ease',
          background: 'rgba(255, 23, 68, 0.05)',
          border: '1px solid var(--red)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '28px', color: 'var(--red)', margin: '0 0 16px 0' }}>
            Analysis Complete
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ 
              background: 'var(--red)', 
              color: '#fff', 
              padding: '12px 24px', 
              borderRadius: '8px',
              fontFamily: 'var(--font-head)', 
              fontSize: '32px' 
            }}>
              {result.prob}%
            </div>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>
              Probability of Scam
            </div>
          </div>

          <h4 style={{ color: 'var(--cyan)', marginBottom: '12px' }}>Detected Red Flags:</h4>
          <ul style={{ color: 'var(--muted)', margin: 0, paddingLeft: '20px' }}>
            {result.flags.map((flag, idx) => (
              <li key={idx} style={{ marginBottom: '8px' }}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

    </div>
  )
}