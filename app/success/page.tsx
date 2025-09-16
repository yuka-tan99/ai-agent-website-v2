// app/success/page.tsx
'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function Success() {
  const router = useRouter()
  const search = useSearchParams()
  useEffect(() => {
    let active = true, t: any
    const poll = async (i = 0) => {
      const redirect = search.get('redirect') || '/dashboard'
      // Fast-path for plan purchases: kick user to preparing ASAP
      if (i === 0 && redirect.startsWith('/dashboard')) {
        // Try a one-shot manual confirm to self-heal if webhook missed
        const sid = search.get('session_id')
        if (sid) { try { await fetch(`/api/stripe/confirm?session_id=${encodeURIComponent(sid)}`, { cache: 'no-store' }) } catch {} }
        if (active) { router.replace('/dashboard/preparing'); return }
      }
      // If redirecting to account, this is likely an AI purchase. Poll AI access instead of plan status.
      if (redirect.startsWith('/account')) {
        try {
          const resAi = await fetch('/api/me/access?product=ai', { cache: 'no-store' })
          const jAi = await resAi.json().catch(() => ({}))
          if (!active) return
          if (jAi?.active) { router.replace(redirect); return }
        } catch {}
      } else {
        const res = await fetch('/api/me/purchase-status', { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (!active) return
        if (json.purchase_status === 'paid') {
          // after plan purchase, send to preparing page to generate report
          const target = redirect.startsWith('/dashboard') ? '/dashboard/preparing' : redirect
          router.replace(target); return
        }
      }
      // Try to self-heal if we have a session_id (webhook may have missed)
      const sid = search.get('session_id')
      if (sid && i === 0) {
        try { await fetch(`/api/stripe/confirm?session_id=${encodeURIComponent(sid)}`, { cache: 'no-store' }) } catch {}
      }
      if (i < 12) t = setTimeout(() => poll(i + 1), 800 + 200 * i)
      else {
        // fallback if webhook never hits: send to appropriate paywall
        const paywall = redirect.startsWith('/account') ? '/paywall/ai' : '/paywall'
        router.replace(paywall)
      }
    }
    poll()
    return () => { active = false; if (t) clearTimeout(t) }
  }, [router, search])
  // No intermediary UI; immediately redirects above
  return null
}
