// app/api/report/route.ts
export const dynamic = 'force-dynamic'   // fine here
export const runtime = 'nodejs'          // (optional but explicit)

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET() {
  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data, error } = await supa
    .from('reports')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: data?.plan ?? null })
}