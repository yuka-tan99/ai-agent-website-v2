// app/api/chat/analytics/route.ts
import { NextRequest, NextResponse } from "next/server"
import { supabaseRoute } from "@/lib/supabaseServer"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supa = supabaseRoute()
    const { data: { user } } = await supa.auth.getUser()

    // Always log to server console for debugging
    console.log("[chat-analytics]", { user_id: user?.id, ...body })

    // Persist thumbs feedback when available
    if (user && body?.event === 'feedback') {
      const value = (body?.value || '').toString()
      const index = Number.isFinite(body?.index) ? Number(body.index) : null
      const text = (body?.text || '').toString()
      const message_id = Number.isFinite(body?.message_id) ? Number(body.message_id) : null
      if ((value === 'up' || value === 'down' || value === 'cleared') && index !== null) {
        // Insert best-effort; ignore failures (RLS/schema) to avoid interrupting UX
        try {
          await supa.from('chat_feedback').insert({
            user_id: user.id,
            message_index: index,
            message_id,
            value,
            message: text?.slice(0, 1000) || null,
          })
        } catch (e) {
          console.warn('[chat-analytics] persist failed (safe to ignore)', e)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
