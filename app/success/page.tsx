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
      const res = await fetch('/api/me/purchase-status', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!active) return
      if (json.purchase_status === 'paid') {
        const redirect = search.get('redirect') || '/dashboard'
        router.replace(redirect); return
      }
      // Try to self-heal if we have a session_id (webhook may have missed)
      const sid = search.get('session_id')
      if (sid && i === 0) {
        try { await fetch(`/api/stripe/confirm?session_id=${encodeURIComponent(sid)}`, { cache: 'no-store' }) } catch {}
      }
      if (i < 12) t = setTimeout(() => poll(i + 1), 800 + 200 * i)
      else {
        // fallback if webhook never hits: send to appropriate paywall
        const redirect = search.get('redirect') || '/dashboard'
        const paywall = redirect.startsWith('/account') ? '/paywall/ai' : '/paywall'
        router.replace(paywall)
      }
    }
    poll()
    return () => { active = false; if (t) clearTimeout(t) }
  }, [router, search])
  return <div className="p-8">Finishing up your purchase…</div>
}
