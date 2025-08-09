// lib/supabaseClient.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// No args needed; helpers read NEXT_PUBLIC_* from env automatically.
export const supabaseBrowser = () => createClientComponentClient()
// export const supabaseBrowser = () => createBrowserClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// )
