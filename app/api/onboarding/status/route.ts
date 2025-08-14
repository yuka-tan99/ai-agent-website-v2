// app/api/onboarding/status/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isOnboardingComplete(answers: Record<string, any> | null | undefined): boolean {
  if (!answers || typeof answers !== 'object') return false
  const required = ["creatingAs", "identity", "goal", "platforms", "topics", "reach", "timeAvailable"]
  return required.every((k) => {
    const v = (answers as any)[k]
    return Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim().length > 0 : !!v
  })
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = (searchParams.get('sessionId') || '').trim()

    // 1) If a sessionId was provided, check that session directly (works for anon users)
    if (sessionId) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const key = process.env.SUPABASE_SERVICE_KEY!
      const admin = createClient(url, key)

      const { data: sess, error: sErr } = await admin
        .from('onboarding_sessions')
        .select('answers')
        .eq('id', sessionId)
        .maybeSingle()

      if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
      return NextResponse.json({ complete: isOnboardingComplete(sess?.answers) })
    }

    // 2) Otherwise, if signed in, check the latest session tied to the user
    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ complete: false }, { status: 200 })

    const { data, error } = await sb
      .from('onboarding_sessions')
      .select('answers')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const answers = data?.[0]?.answers || null
    return NextResponse.json({ complete: isOnboardingComplete(answers) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}