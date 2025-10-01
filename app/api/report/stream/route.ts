// app/api/report/stream/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { supabaseRoute } from '@/lib/supabaseServer'

function sseHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
}

export async function GET() {
  const supa = supabaseRoute()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const encoder = new TextEncoder()
  let interval: NodeJS.Timeout | null = null
  let closed = false

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: any) => {
        if (closed) return
        try {
          const data = typeof payload === 'string' ? payload : JSON.stringify(payload)
          controller.enqueue(encoder.encode(`event: ${event}\n`))
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch {
          // ignore enqueue on closed controller
        }
      }

      // Initial hello
      send('hello', { ok: true })

      interval = setInterval(async () => {
        try {
          // Fetch current plan and job
          const { data: rep } = await supa
            .from('reports')
            .select('plan')
            .eq('user_id', user.id)
            .maybeSingle()

          const { data: job } = await supa
            .from('report_jobs')
            .select('phase, pct, updated_at')
            .eq('user_id', user.id)
            .maybeSingle()

          if (job) send('progress', { phase: job.phase || 'queued', pct: typeof job.pct === 'number' ? job.pct : 0 })

          if (rep?.plan) {
            const l2 = (rep as any).plan?.layers_v2
            if (l2 && l2.sections) {
              const sec = l2.sections
              const keys = ['primaryObstacle','strategicFoundation','personalBrand','monetizationPath','mentalHealth','successMeasurement'] as const
              let count = 0
              keys.forEach((k) => {
                try {
                  const r = sec[k]?.report
                  if (r && ((Array.isArray(r.bullets) && r.bullets.length > 0) || (r.title && String(r.title).trim().length > 0))) count++
                } catch {}
              })
              send('sections', { l2_ready: count })
              if (count >= 1) {
                send('done', { done: true })
                if (interval) clearInterval(interval)
                closed = true
                try { controller.close() } catch {}
                return
              }
            } else {
              // Legacy fallback
              const sections = rep.plan?.sections || {}
              const keys = [
                'ai_marketing_psychology',
                'foundational_psychology',
                'platform_specific_strategies',
                'content_strategy',
                'posting_frequency',
                'metrics_mindset',
                'mental_health',
              ] as const
              const ready: Record<string, boolean> = {}
              let count = 0
              keys.forEach((k) => {
                const s = (sections as any)?.[k]
                const ok = !!(s && Array.isArray(s.bullets) && s.bullets.length > 0)
                ready[k as string] = ok
                if (ok) count++
              })
              send('sections', ready)
              if (count === keys.length) {
                send('done', { done: true })
                if (interval) clearInterval(interval)
                closed = true
                try { controller.close() } catch {}
                return
              }
            }
          }
        } catch (e) {
          // keep stream alive on transient errors
          send('ping', { t: Date.now() })
        }
      }, 1000)
    },
    cancel() {
      if (interval) clearInterval(interval)
      closed = true
    }
  })

  return new Response(stream, { headers: sseHeaders() })
}
