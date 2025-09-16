// app/api/admin/delete-user/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

function unauthorized(msg = 'unauthorized') {
  return NextResponse.json({ error: msg }, { status: 401 })
}

export async function POST(req: NextRequest) {
  try {
    const authz = req.headers.get('authorization') || ''
    const token = authz.startsWith('Bearer ') ? authz.slice(7) : ''
    const secret = process.env.ADMIN_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    if (!secret || token !== secret) return unauthorized()

    const body = await req.json().catch(() => ({}))
    const user_id = (body?.user_id || '').toString()
    if (!user_id || user_id.length < 10) {
      return NextResponse.json({ error: 'missing or invalid user_id' }, { status: 400 })
    }

    const sb = supabaseAdmin()

    const errors: Record<string, string> = {}

    // Helper to run a delete and swallow errors into the errors map
    async function del(table: string, matcher: (q: any) => any) {
      try {
        // @ts-ignore
        let q = sb.from(table).delete()
        q = matcher(q)
        await q
      } catch (e: any) {
        errors[table] = e?.message || 'delete failed'
      }
    }

    // 1) Chat data (respect child->parent order)
    await del('chat_feedback', (q:any)=> q.eq('user_id', user_id))
    await del('chat_messages', (q:any)=> q.eq('user_id', user_id))
    await del('chat_threads',  (q:any)=> q.eq('user_id', user_id))
    await del('chat_usage_events', (q:any)=> q.eq('user_id', user_id))

    // 2) Access/subscriptions BEFORE payments (FKs reference payments)
    await del('access_grants', (q:any)=> q.eq('user_id', user_id))
    await del('subscription_periods', (q:any)=> q.eq('user_id', user_id))

    // 3) Reports and progress
    await del('report_jobs', (q:any)=> q.eq('user_id', user_id))
    await del('reports', (q:any)=> q.eq('user_id', user_id))

    // 4) Onboarding/profile
    await del('onboarding_sessions', (q:any)=> q.eq('user_id', user_id))
    await del('profiles', (q:any)=> q.eq('user_id', user_id))

    // 5) Payments last (since others may FK to payments.id)
    await del('payments', (q:any)=> q.eq('user_id', user_id))

    // 6) Remove auth user (service role)
    try {
      // @ts-ignore supabase-js admin API
      await sb.auth.admin.deleteUser(user_id)
    } catch (e: any) {
      errors['auth.users'] = e?.message || 'auth delete failed'
    }

    const ok = Object.keys(errors).length === 0
    return NextResponse.json({ ok, errors: ok ? undefined : errors })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

