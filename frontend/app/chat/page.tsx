import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

const SYSTEM_PROMPT = `You are a cybersecurity expert for Indian users. Analyze the input for scam/fraud indicators.

Respond ONLY in this exact JSON format with no extra text, no markdown, no code fences:

{
  "probability": 85,
  "verdict": "DANGEROUS",
  "redFlags": ["Urgency tactic", "Suspicious URL", "Requests personal info"],
  "analysis": "2-3 sentence explanation of why this is or isn't a scam.",
  "action": "Recommended action for the user.",
  "scamType": "Phishing"
}

verdict must be one of: SAFE, SUSPICIOUS, DANGEROUS
scamType must be one of: Phishing, Vishing, Smishing, Investment Fraud, KYC Fraud, Job Scam, Lottery Scam, None, Other
probability is a number from 0 to 100.
Be aggressive — urgency, prize claims, bank/KYC requests, suspicious URLs are almost always DANGEROUS.
Return ONLY the raw JSON object. No explanation outside JSON. No markdown. No code fences.`

function parseResponse(raw: string) {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return {
      probability: 50,
      verdict: 'SUSPICIOUS',
      redFlags: ['Could not fully parse response'],
      analysis: cleaned || 'Analysis incomplete. Please try again.',
      action: 'Exercise caution and try scanning again.',
      scamType: 'Other',
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, imageBase64, imageMimeType } = body

    if (!message && !imageBase64) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 })
    }

    let result

    if (imageBase64) {
      const userContent: Groq.Chat.ChatCompletionContentPart[] = [
        {
          type: 'image_url',
          image_url: {
            url: `data:${imageMimeType ?? 'image/jpeg'};base64,${imageBase64}`,
          },
        },
        {
          type: 'text',
          text: message
            ? `Analyze this screenshot for scam indicators. User context: "${message}"`
            : 'Read every word in this screenshot and analyze it for scam/fraud indicators.',
        },
      ]

      const response = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 1024,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      })

      result = parseResponse(response.choices[0].message.content ?? '')
      return NextResponse.json({ reply: result, method: 'vision+groq' })

    } else {
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analyze this for scam indicators:\n\n${message}` },
        ],
      })

      result = parseResponse(response.choices[0].message.content ?? '')
      return NextResponse.json({ reply: result, method: 'groq' })
    }

  } catch (err: unknown) {
    console.error('Scanner API error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

// Default page export (legacy page - not used)
export default function ChatPage() {
  return (
    <div style={{ padding: '20px', color: '#fff' }}>
      <h1>Chat API</h1>
      <p>This is a legacy API route. Use the app normally.</p>
    </div>
  )
}