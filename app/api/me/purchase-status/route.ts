// app/api/me/purchase-status/route.ts
import { NextResponse } from 'next/server'
import { supabaseRoute } from '@/lib/supabaseServer'

export async function GET() {
  const supa = supabaseRoute()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 })
  const { data, error } = await supa
    .from('onboarding_sessions')
    .select('purchase_status')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ purchase_status: data?.purchase_status ?? 'none' })
}