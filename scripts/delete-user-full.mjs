import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } })

async function deleteTable(table, where) {
  let q = sb.from(table).delete()
  q = where(q)
  const { error } = await q
  if (error) throw new Error(`${table}: ${error.message}`)
}

async function main() {
  const userId = process.argv[2]
  if (!userId) {
    console.error('Usage: node scripts/delete-user-full.mjs <user_id>')
    process.exit(1)
  }

  const errors = {}

  const steps = [
    ['chat_feedback',          (q) => q.eq('user_id', userId)],
    ['chat_messages',          (q) => q.eq('user_id', userId)],
    ['chat_threads',           (q) => q.eq('user_id', userId)],
    ['chat_usage_events',      (q) => q.eq('user_id', userId)],
    ['access_grants',          (q) => q.eq('user_id', userId)],
    ['subscription_periods',   (q) => q.eq('user_id', userId)],
    ['reports',                (q) => q.eq('user_id', userId)],
    ['onboarding_sessions',    (q) => q.eq('user_id', userId)],
    ['profiles',               (q) => q.eq('user_id', userId)],
    ['payments',               (q) => q.eq('user_id', userId)],
  ]

  for (const [table, where] of steps) {
    try { await deleteTable(table, where) } catch (e) { errors[table] = e.message }
  }

  try {
    const { error } = await sb.auth.admin.deleteUser(userId)
    if (error) throw error
  } catch (e) {
    errors['auth.users'] = e.message || 'auth delete failed'
  }

  if (Object.keys(errors).length) {
    console.error('Completed with errors:', errors)
    process.exit(2)
  }
  console.log('Deleted user and app data:', userId)
}

main().catch((e) => { console.error(e); process.exit(1) })

