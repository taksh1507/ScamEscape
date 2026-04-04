import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

const SYSTEM_PROMPT = `You are FraudGuard AI, an expert cybersecurity assistant specializing in detecting scams, phishing attempts, and fraud in India and globally.

Analyze the input and respond ONLY in this exact JSON format with no extra text, no markdown, no code fences:

{
  "riskLevel": "HIGH",
  "riskScore": 85,
  "redFlags": ["Urgent language to create panic", "Requesting bank details"],
  "explanation": "This message exhibits classic scam traits including prize winning claims and requests for sensitive bank information.",
  "recommendedActions": ["Do not share bank details", "Report to 1930 cybercrime helpline", "Block the sender"],
  "scamType": "Lottery Scam"
}

riskLevel must be one of: HIGH, MEDIUM, LOW, SAFE
scamType must be one of: Phishing, Vishing, Smishing, Investment Fraud, KYC Fraud, Job Scam, Lottery Scam, None, Other
riskScore is a number from 0 to 100.
Be aggressive in flagging scams — prize winning messages, requests for bank info, urgent claims are almost always HIGH risk.
Return ONLY the raw JSON object. No explanation outside the JSON. No markdown. No code fences.`

function parseResponse(raw: string) {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return {
      riskLevel: 'UNKNOWN',
      riskScore: 50,
      redFlags: [],
      explanation: cleaned || 'Could not parse response. Please try again.',
      recommendedActions: ['Try again with more detail.'],
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
            ? `Analyze this screenshot for scam indicators. Additional context: ${message}`
            : 'Read all the text in this screenshot and analyze it for scam indicators. Extract every word visible in the image.',
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
    console.error('API error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}