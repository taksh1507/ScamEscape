'use client'

import { useState, useRef } from 'react'
import { Search, Trash2, FileImage, Camera, Image, Upload, AlertCircle, Cpu, Loader2 } from 'lucide-react'
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
  purple: '#f50057',
  yellow: '#ffb700',
  orange: '#ff9100'
}

const Spinner = ({ size = 24 }: { size?: number }) => (
  <Loader2 size={size} className="animate-spin" color={T.cyan} />
)

const Tag = ({ color, children }: { color: string, children: React.ReactNode }) => (
  <span style={{ padding: '4px 8px', fontSize: 11, background: `${color}15`, color: color, borderRadius: 4, border: `1px solid ${color}40`, fontWeight: 700 }}>{children}</span>
)

const Scanner = () => {
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const EXAMPLES = [
    "URGENT: Your HDFC account will be suspended in 2 hours. Complete KYC now: hdfc-verify.net/kyc",
    "Congratulations! Your number won ₹1,00,000 in Jio Lucky Draw. Claim: bit.ly/jio-prize9",
    "Hi! Work from home — earn ₹5,000/day liking YouTube videos. No skills needed. Reply YES.",
  ];

  const toBase64 = (file: File) => new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const handleFile = async (file?: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    const base64 = await toBase64(file);
    setImage({ base64, mimeType: file.type, preview: URL.createObjectURL(file) });
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); };

  const analyze = async () => {
    if (!text.trim() && !image) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim() || undefined,
          imageBase64: image?.base64 ?? undefined,
          imageMimeType: image?.mimeType ?? undefined,
        }),
      });

      const data = await res.json();
      console.log('API result:', data);

      if (!res.ok) throw new Error(data.error || 'API Error');

      setResult(data.reply);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '80px 24px 60px', maxWidth: 900, margin: '0 auto', minHeight: '80vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <div style={{ padding: 13, background: `${T.cyan}12`, borderRadius: 10 }}><Search size={26} color={T.cyan} /></div>
        <div>
          <h2 className="syne" style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: '2px', margin: 0, textTransform: 'uppercase' }}>AI <span style={{ color: T.red }}>Scanner</span></h2>
          <p style={{ color: T.mid, fontSize: 15, margin: '4px 0 0 0' }}>Powered by Groq · Paste text <strong style={{ color: '#fff' }}>or upload a screenshot</strong> for instant fraud analysis</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28, marginTop: 28 }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Drop zone */}
          <div
            style={{
              padding: '24px',
              border: `2px dashed ${drag ? T.cyan : T.border}`,
              borderRadius: '12px',
              background: drag ? `${T.cyan}05` : 'var(--card)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minHeight: '180px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => !image && fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
            {image ? (
              <div style={{ width: '100%' }}>
                <img src={image.preview} alt="Upload" style={{ width: '100%', maxHeight: 190, objectFit: 'contain', borderRadius: 8, marginBottom: 16 }} />
                <button onClick={e => { e.stopPropagation(); setImage(null); setResult(null); }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: `${T.red}15`, border: `1px solid ${T.red}30`, borderRadius: 5, color: T.red, padding: '8px 16px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, margin: '0 auto', fontWeight: 600 }}>
                  <Trash2 size={14} /> Remove image
                </button>
              </div>
            ) : (
              <>
                <FileImage size={36} color={T.dim} style={{ marginBottom: 14 }} />
                <div style={{ fontWeight: 600, color: T.mid, fontSize: 15, marginBottom: 6 }}>Drop screenshot here</div>
                <div className="mono" style={{ fontSize: 11, color: T.dim, letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>or click to browse · PNG / JPG / WEBP</div>
                <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 18 }}>
                  <Camera size={16} color={T.dim} /><Image size={16} color={T.dim} /><Upload size={16} color={T.dim} />
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span className="mono" style={{ fontSize: 11, color: T.dim, fontFamily: 'var(--font-mono)' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          {/* Text */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste suspicious SMS, email, WhatsApp message, or call script here…"
            style={{ width: '100%', minHeight: 120, background: 'rgba(0,0,0,0.4)', border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, color: '#fff', fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.65, resize: 'vertical', outline: 'none', transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = T.red}
            onBlur={e => e.target.style.borderColor = T.border}
          />

          <button
            onClick={analyze}
            disabled={loading || (!text.trim() && !image)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: loading || (!text.trim() && !image) ? 'var(--dark2)' : T.cyan,
              color: loading || (!text.trim() && !image) ? T.dim : '#000',
              padding: '16px',
              fontFamily: 'var(--font-head)',
              fontSize: '20px',
              fontWeight: 800,
              border: 'none',
              cursor: loading || (!text.trim() && !image) ? 'default' : 'pointer',
              clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
              transition: 'all 0.3s'
            }}>
            {loading ? <><Spinner size={18} /> Analyzing...</> : <><Search size={18} /> Run Threat Analysis</>}
          </button>

          {/* Examples */}
          <div style={{ marginTop: '12px' }}>
            <div className="mono" style={{ fontSize: 11, color: T.dim, letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Try an example:</div>
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => { setText(ex); setImage(null); setResult(null); }}
                style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: T.mid, fontSize: 14, textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)', lineHeight: 1.45, marginBottom: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.cyan; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = T.mid; }}>
                {ex.slice(0, 72)}…
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Result */}
        <div>

          {/* Loading */}
          {loading && (
            <div style={{ background: 'var(--card)', border: `1px solid ${T.border}`, borderRadius: '12px', padding: 32, textAlign: 'center', minHeight: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              <Spinner size={40} />
              <div className="mono" style={{ fontSize: 14, color: T.red, letterSpacing: '0.12em', fontFamily: 'var(--font-mono)' }}>
                {image ? 'READING SCREENSHOT...' : 'ANALYZING THREAT VECTORS...'}
              </div>
              <div style={{ color: T.dim, fontSize: 14, maxWidth: 260, lineHeight: 1.6 }}>
                {image
                  ? 'Vision model is examining the screenshot for visual scam patterns, fake URLs, and suspicious branding'
                  : 'Groq is examining language patterns, domains, and social engineering tactics'}
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{ background: 'var(--card)', border: `1px solid ${T.red}35`, borderRadius: '12px', padding: 24 }}>
              <AlertCircle size={26} color={T.red} style={{ marginBottom: 12 }} />
              <p style={{ color: T.red, fontWeight: 600, fontSize: 16, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Result */}
          {result && !loading && (() => {
            const prob    = result.probability    ?? result.riskScore          ?? 0
            const verdict = result.verdict        ?? result.riskLevel          ?? 'UNKNOWN'
            const analysis= result.analysis       ?? result.explanation        ?? 'No analysis available.'
            const action  = result.action         ?? result.recommendedActions?.[0] ?? 'Exercise caution.'
            const flags   = result.redFlags       ?? []
            const scamType= result.scamType       ?? 'Other'

            let vc = T.cyan
            if      (verdict === 'SAFE'      || verdict === 'LOW')    vc = T.green
            else if (verdict === 'SUSPICIOUS'|| verdict === 'MEDIUM') vc = T.yellow
            else if (verdict === 'DANGEROUS' || verdict === 'HIGH')   vc = T.red

            return (
              <div style={{ background: 'var(--card)', borderRadius: '12px', padding: 28, border: `1px solid ${vc}28`, minHeight: 360, animation: 'fadeSlideUp 0.4s ease' }}>

                {/* Header: verdict + score circle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div>
                    <div className="mono" style={{ fontSize: 11, color: T.dim, marginBottom: 6, fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>VERDICT</div>
                    <div className="syne" style={{ fontSize: 32, fontWeight: 800, color: vc, fontFamily: 'var(--font-head)', letterSpacing: '1px' }}>{verdict}</div>
                  </div>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', border: `3px solid ${vc}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `${vc}10`, boxShadow: `0 0 20px ${vc}20` }}>
                    <div className="syne" style={{ fontSize: 32, fontWeight: 800, color: vc, lineHeight: 1, fontFamily: 'var(--font-head)' }}>{prob}</div>
                    <div className="mono" style={{ fontSize: 10, color: vc, fontFamily: 'var(--font-mono)' }}>% RISK</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 24, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${prob}%`, background: `linear-gradient(90deg,${T.green},${T.yellow} 50%,${T.red})`, transition: 'width 1.2s ease' }} />
                </div>

                {/* Scam type */}
                {scamType && scamType !== 'None' && (
                  <div style={{ marginBottom: 20 }}>
                    <div className="mono" style={{ fontSize: 11, color: T.dim, marginBottom: 8, fontFamily: 'var(--font-mono)' }}>SCAM TYPE</div>
                    <Tag color={T.orange}>{scamType}</Tag>
                  </div>
                )}

                {/* Red flags */}
                {flags.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div className="mono" style={{ fontSize: 11, color: T.dim, marginBottom: 10, fontFamily: 'var(--font-mono)' }}>⚠ RED FLAGS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {flags.map((f: string, i: number) => (
                        <span key={i} style={{ fontSize: 12, padding: '4px 10px', background: `${T.red}0C`, color: '#ff7070', border: `1px solid ${T.red}30`, borderRadius: 6, fontFamily: 'var(--font-body)' }}>{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis */}
                <div style={{ padding: 16, background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 16 }}>
                  <div className="mono" style={{ fontSize: 11, color: T.dim, marginBottom: 8, fontFamily: 'var(--font-mono)' }}>ANALYSIS</div>
                  <p style={{ fontSize: 14, color: '#ccc', lineHeight: 1.7, margin: 0 }}>{analysis}</p>
                </div>

                {/* Action */}
                <div style={{ padding: 16, background: `${T.cyan}08`, border: `1px solid ${T.cyan}2A`, borderRadius: 10 }}>
                  <div className="mono" style={{ fontSize: 11, color: T.cyan, marginBottom: 8, fontFamily: 'var(--font-mono)' }}>✓ RECOMMENDED ACTION</div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.6, margin: 0 }}>{action}</p>
                </div>

              </div>
            )
          })()}

          {/* Standby */}
          {!result && !loading && !error && (
            <div style={{ background: 'var(--card)', padding: 40, textAlign: 'center', opacity: 0.6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, border: '2px dashed rgba(255,255,255,0.07)', borderRadius: '12px' }}>
              <Cpu size={56} style={{ marginBottom: 20, color: T.dim }} />
              <div className="mono" style={{ fontSize: 12, color: T.dim, letterSpacing: '0.15em', fontFamily: 'var(--font-mono)' }}>NEURAL ENGINE STANDBY</div>
              <div style={{ fontSize: 14, color: T.mid, marginTop: 12, lineHeight: 1.6 }}>Upload a screenshot or paste a<br />suspicious message to begin analysis</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default function ScannerPage() {
  return (
    <>
      <CursorEffect />
      <Navbar />
      <main style={{ position: 'relative', zIndex: 10 }}>
        <Scanner />
      </main>
      <Footer />
    </>
  )
}