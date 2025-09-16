import { NextResponse } from 'next/server'
import { supabaseRoute } from '@/lib/supabaseServer'

export async function GET() {
  const supa = supabaseRoute()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 })

  const { data: rep } = await supa
    .from('reports')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (rep) return NextResponse.json({ done: true, phase: 'done', pct: 100 })

  const { data: job } = await supa
    .from('report_jobs')
    .select('phase, pct, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    done: false,
    phase: job?.phase || 'queued',
    pct: typeof job?.pct === 'number' ? job.pct : 0,
    updated_at: job?.updated_at || null,
  })
}

