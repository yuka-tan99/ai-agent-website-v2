// app/api/me/chat/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseRoute } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  const supa = supabaseRoute()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '1000', 10) || 1000, 5000)

  const { data: msgs, error } = await supa
    .from('chat_messages')
    .select('id, role, content, meta, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const payload = {
    user_id: user.id,
    exported_at: new Date().toISOString(),
    count: (msgs || []).length,
    messages: msgs || [],
  }

  const json = JSON.stringify(payload, null, 2)
  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="chat_export.json"',
    },
  })
}

