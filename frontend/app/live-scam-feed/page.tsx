'use client'
import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'

export default function Page() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    fetch("http://127.0.0.1:8000/live-scams")
      .then(res => res.json())
      .then(raw => {
        const safeData = (Array.isArray(raw) ? raw : []).map((item: any) => ({
          title: item?.title || "No title",
          description: item?.description || "No description",
          source: item?.source || "Unknown",
          image: item?.image || null,
          url: item?.url || "#",
          risk: (item?.risk || "unknown").toLowerCase(),
          type: item?.type || "unknown",
          summary: item?.summary || "",
        }))
        setData(safeData)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const getRiskStyle = (risk: string) => {
    if (risk === "high") return { bg: "#ff4d4f", glow: "0 0 10px #ff4d4f" }
    if (risk === "medium") return { bg: "#faad14", glow: "0 0 10px #faad14" }
    if (risk === "low") return { bg: "#52c41a", glow: "0 0 10px #52c41a" }
    return { bg: "#888", glow: "none" }
  }

  return (
    <>
      <Navbar onEnter={() => window.location.href = '/'} />
      <div style={{
        minHeight: "100vh",
        background: 'linear-gradient(135deg, rgba(5,5,9,0.95) 0%, rgba(15,23,42,0.95) 100%)',
        color: "#fff",
        padding: "100px 40px 40px 40px",
      }}>
        {/* Header Section */}
        <div style={{ marginBottom: "50px" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              width: '48px', height: '48px',
              border: '2px solid var(--red)', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,23,68,0.1)',
            }}>
              <span style={{ fontSize: '24px' }}>🚨</span>
            </div>
            <h1 style={{
              fontSize: "36px",
              fontFamily: 'var(--font-head)',
              letterSpacing: '2px',
              margin: 0,
              background: 'linear-gradient(135deg, #fff 0%, var(--red) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              LIVE SCAM FEED
            </h1>
          </div>
          <p style={{
            fontSize: "14px",
            color: 'var(--muted)',
            letterSpacing: '1px',
            marginBottom: '20px',
          }}>
            Real-time threat intelligence from the ScamEscape network
          </p>
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, var(--red) 0%, transparent 100%)',
            marginTop: '20px',
          }}></div>
        </div>

        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}>
            <p style={{ fontSize: '16px', color: 'var(--muted)' }}>🔍 Scanning threats...</p>
          </div>
        )}

        {/* Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "24px"
        }}>
        {data.map((item: any, i: number) => {
          const risk = item?.risk || "unknown"
          const style = getRiskStyle(risk)

          return (
            <div
              key={i}
              onClick={() => {
                if (item.url && item.url !== "#") {
                  window.open(item.url, "_blank")
                }
              }}
              style={{
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(10px)",
                borderRadius: "12px",
                padding: "18px",
                border: hoveredIndex === i ? "1px solid rgba(255,23,68,0.4)" : "1px solid rgba(255,23,68,0.2)",
                boxShadow: hoveredIndex === i ? "0 8px 30px rgba(0,0,0,0.5), 0 0 30px rgba(255,23,68,0.15)" : "0 4px 20px rgba(0,0,0,0.4), 0 0 20px rgba(255,23,68,0.05)",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: hoveredIndex === i ? "translateY(-8px)" : "translateY(0)",
                height: "420px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Top Section */}
              <div>
                {/* Image */}
                {item.image && (
                  <img
                    src={item.image}
                    style={{
                      width: "100%",
                      height: "150px",
                      objectFit: "cover",
                      borderRadius: "12px",
                      marginBottom: "10px"
                    }}
                  />
                )}

                {/* Title */}
                <h3 style={{
                  fontSize: "15px",
                  fontFamily: 'var(--font-head)',
                  letterSpacing: '0.5px',
                  fontWeight: 600,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  margin: '10px 0 8px 0',
                  color: '#fff',
                }}>
                  {item.title}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: "13px",
                  color: "var(--muted)",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  margin: 0,
                  lineHeight: '1.5',
                }}>
                  {item.description}
                </p>
              </div>

              {/* Bottom Section */}
              <div>
                {/* Risk Badge */}
                <div style={{ marginTop: "12px" }}>
                  <span style={{
                    background: style.bg,
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: '1px',
                    boxShadow: style.glow,
                    textTransform: 'uppercase',
                  }}>
                    {risk.toUpperCase()}
                  </span>
                </div>

                {/* Type */}
                <p style={{
                  fontSize: "12px",
                  marginTop: "10px",
                  color: '#ccc',
                  margin: '10px 0 0 0',
                }}>
                  <span style={{ color: 'var(--red)' }}>●</span> {' '}
                  <b style={{ color: '#fff' }}>Type:</b> {item.type}
                </p>

                {/* Source */}
                <div style={{
                  marginTop: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "12px",
                  color: "var(--muted)"
                }}>
                  <span style={{ maxWidth: '70%', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {item.source}
                  </span>
                  <span style={{ color: "var(--red)", fontWeight: 600 }}>
                    → OPEN
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </>
  )
}