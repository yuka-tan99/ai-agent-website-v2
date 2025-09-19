export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseRoute } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Preserve ?next for post-auth redirect, fallback to /onboarding
  const next = searchParams.get('next') || '/auth/signed-up'
  // Prevent open redirects: only allow same-origin paths
  const safeNext = next.startsWith('/') ? next : '/onboarding'
  const redirectTo = new URL(safeNext, origin)

  const supa = supabaseRoute()
  if (code) await supa.auth.exchangeCodeForSession(code)

  try {
    // Fetch the authed user and derive provider
    const { data: { user } } = await supa.auth.getUser()
    if (user?.id) {
      const provider = (user.app_metadata?.provider as string | undefined) || 'unknown'
      const now = new Date().toISOString()

      // Attempt to read rough geolocation from platform headers (Vercel/Edge)
      const h = headers()
      const city = h.get('x-vercel-ip-city') || undefined
      const state = h.get('x-vercel-ip-country-region') || h.get('x-vercel-ip-region') || undefined
      const country = h.get('x-vercel-ip-country') || undefined
      const locSource = city || state || country ? 'vercel-headers' : undefined

      // Read existing profile to preserve signup_* if already set
      const { data: existing } = await supa
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existing) {
        // First-time profile row
        await supa
          .from('profiles')
          .insert({
            user_id: user.id,
            signup_provider: provider,
            signup_at: now,
            last_login_provider: provider,
            last_login_at: now,
            city: city || null,
            state: state || null,
            country: country || null,
            location_source: locSource || null,
            updated_at: now,
          })
      } else {
        // Update last login and fill location if missing
        await supa
          .from('profiles')
          .update({
            last_login_provider: provider,
            last_login_at: now,
            city: existing.city || city || null,
            state: existing.state || state || null,
            country: existing.country || country || null,
            location_source: existing.location_source || locSource || null,
            updated_at: now,
          })
          .eq('user_id', user.id)
      }
    }
  } catch (e) {
    // Non-fatal: logging only; do not block redirect
    console.warn('auth/callback profile upsert failed:', e)
  }

  return NextResponse.redirect(redirectTo.toString())
}
