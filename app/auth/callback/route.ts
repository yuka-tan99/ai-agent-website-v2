import { NextResponse } from 'next/server'
import { supabaseRoute } from '@/lib/supabaseServer'
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectTo = new URL('/onboarding', request.url)
  const supa = supabaseRoute()
  if (code) await supa.auth.exchangeCodeForSession(code)
  return NextResponse.redirect(redirectTo.toString())
}
