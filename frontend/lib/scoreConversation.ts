/**
 * scoreConversation.ts — Score a full call conversation using GROQ AI
 * 
 * Called when the call ends (terminal phase) to holistically score
 * the entire player interaction instead of individual actions.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface ConversationMessage {
  role: 'scammer' | 'user'
  text: string
  risk_level?: string
}

export interface CallScore {
  points: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  grade_label: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Failed'
  analysis: string
  tip: string
  was_scammed: boolean
}

export async function scoreConversation(
  conversation: ConversationMessage[],
  scenarioType: string,
  callerName: string
): Promise<CallScore> {
  // Build conversation transcript
  const transcript = conversation
    .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
    .join('\n')

  console.log('🤖 Sending conversation to GROQ for holistic scoring...')
  console.log('📝 Transcript length:', transcript.length, 'chars')
  console.log('🔗 API URL:', BASE)
  console.log('📊 Scenario:', scenarioType, 'Caller:', callerName)

  const maxRetries = 2
  let lastError: any = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Call backend to score with GROQ
      const url = `${BASE}/game/score-conversation`
      console.log(`📤 Attempt ${attempt}/${maxRetries} - POST request to: ${url}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: transcript,
          scenario_type: scenarioType,
          caller_name: callerName,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      
      console.log(`📥 Response status: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API returned error: ${response.status}`, errorText)
        
        if (response.status === 500 || response.status === 503) {
          // Server error - might be transient, retry
          lastError = new Error(`Server error ${response.status}: ${errorText}`)
          if (attempt < maxRetries) {
            console.log(`⏳ Retrying in 1 second...`)
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
        } else {
          // Client error - don't retry
          throw new Error(`API error ${response.status}: ${errorText}`)
        }
      }

      const score = await response.json()
      console.log('✅ GROQ score received:', score)
      return score
      
    } catch (error) {
      lastError = error
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('❌ Request timeout (30s)')
        } else {
          console.error(`❌ Attempt ${attempt} error:`, error.message)
        }
      } else {
        console.error(`❌ Attempt ${attempt} error:`, error)
      }
      
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in 1 second...`)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  // All retries failed
  console.error('❌ All retry attempts failed. Returning fallback score.')
  console.error('❌ Last error:', lastError)
  
  // Fallback score - average performance
  return {
    points: 50,
    grade: 'B',
    grade_label: 'Good',
    analysis: 'Call analysis could not be completed.',
    tip: 'Always verify caller identity before sharing sensitive information.',
    was_scammed: false,
  }
}
