import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const service = process.env.SUPABASE_SERVICE_KEY as string
  if (!url || !service) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  const supa = createClient(url, service)
  const { data, error } = await supa.from('kb_documents').select('id,title,source,created_at').order('created_at', { ascending: false }).limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documents: data || [] })
}

