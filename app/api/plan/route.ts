import { NextResponse } from 'next/server'
import { openai } from '@/lib/openai'
import { searchKB } from '@/lib/rag'

export async function POST(req: Request){
  const body = await req.json().catch(()=>({}))
  const persona = body.persona || {}

  const query = Object.values(persona).join(' | ') || 'social growth strategy basics'
  const kb = await searchKB(query, 6)
  const kbText = kb.map(k => k.content).join('\n---\n')

  const sys = `You are an AI social media strategist. Respond with JSON keys: profile, strategy[], targeting, roadblocks[], nextSteps[], platformFocus[]. Tone: direct.`
  const user = `Persona:\n${JSON.stringify(persona, null, 2)}\n\nKnowledge:\n${kbText}\n\nCreate a concise plan.`

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.4,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: user }
    ]
  })

  let plan
  try {
    const text = resp.choices[0]?.message?.content || '{}'
    plan = JSON.parse(text)
  } catch {
    plan = {
      profile: "Creator focused on short-form video to grow audience.",
      strategy: ["Daily short-form posting","Comment ladder","Weekly recap"],
      targeting: "18-30, US/UK, learning-focused",
      roadblocks: ["Consistency", "On-camera comfort"],
      nextSteps: ["Record 2 shorts daily","Post at 6pm","Reply to top 20 comments"],
      platformFocus: [{ name:'TikTok', value:40 },{ name:'Instagram', value:30 },{ name:'YouTube', value:20 },{ name:'Pinterest', value:10 }]
    }
  }

  return NextResponse.json(plan)
}
