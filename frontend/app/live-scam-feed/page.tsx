'use client'
import { useEffect, useState } from 'react'

export default function Page() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      color: "#fff",
      padding: "30px"
    }}>
      {/* Header */}
      <h1 style={{ fontSize: "28px", marginBottom: "20px" }}>
        🛡️ Live Scam Feed
      </h1>

      {loading && <p>Scanning threats...</p>}

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "20px"
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
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                padding: "16px",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                cursor: "pointer",
                transition: "0.25s",

                // ✅ SAME SIZE FIX
                height: "420px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.04)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
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
                  fontSize: "16px",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}>
                  {item.title}
                </h3>

                {/* Description */}
                <p style={{
                  fontSize: "13px",
                  color: "#ccc",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}>
                  {item.description}
                </p>
              </div>

              {/* Bottom Section */}
              <div>
                {/* Risk Badge */}
                <div style={{ marginTop: "10px" }}>
                  <span style={{
                    background: style.bg,
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    boxShadow: style.glow
                  }}>
                    {risk.toUpperCase()}
                  </span>
                </div>

                {/* Type */}
                <p style={{ fontSize: "13px", marginTop: "6px" }}>
                  <b>Type:</b> {item.type}
                </p>

                {/* Source */}
                <div style={{
                  marginTop: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  color: "#888"
                }}>
                  <span>{item.source}</span>
                  <span style={{ color: "#38bdf8" }}>
                    View →
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}