// app/api/advice/route.ts
import { NextResponse } from 'next/server'
import { geminiTextModel, GEMINI_SAFETY } from '@/lib/gemini' // you already use these in /api/plan

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { topic, answers } = await req.json().catch(() => ({}))

    const model = geminiTextModel()
    const prompt = `
You are an encouraging, plain-spoken social media content creator coach.
Write 1–2 sentences of supportive, specific advice.
Tone: empathetic, simple, human. Avoid jargon and clichés. No exclamation points.

The user selected this "stuck" feeling: ${JSON.stringify(topic)}
Other onboarding context: ${JSON.stringify(answers)}

Examples of style:
- "Your unique voice is an asset. Keep it simple this week: one repeatable idea, posted twice."
- "Plateau = data. Reuse your top hook in three new angles and ship them this week."

Return ONLY the advice sentence(s).
    `.trim()

    const res = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      safetySettings: GEMINI_SAFETY,
      generationConfig: { temperature: 0.6, maxOutputTokens: 120, responseMimeType: 'text/plain' },
    })

    const text = (res.response?.text?.() || '').trim()
    if (!text) return NextResponse.json({ advice: 'Keep it light. Pick one small win today and ship it.' })

    return NextResponse.json({ advice: text })
  } catch (e: any) {
    return NextResponse.json(
      { advice: 'Small steps compound. Reuse one idea three ways this week and review what sticks.' },
      { status: 200 },
    )
  }
}