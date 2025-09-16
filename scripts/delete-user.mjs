import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

async function main() {
  const userId = process.argv[2]
  if (!userId) {
    console.error('Usage: node scripts/delete-user.mjs <user_id>')
    process.exit(1)
  }

  const { data, error } = await supabase.auth.admin.deleteUser(userId)
  if (error) {
    console.error('Delete failed:', error.message)
    process.exit(1)
  }
  console.log('Deleted auth user:', data)
}

main().catch((e) => { console.error(e); process.exit(1) })

