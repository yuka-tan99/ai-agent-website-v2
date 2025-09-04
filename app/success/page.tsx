// app/success/page.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Success() {
  const router = useRouter()
  useEffect(() => {
    let active = true, t: any
    const poll = async (i = 0) => {
      const res = await fetch('/api/me/purchase-status', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!active) return
      if (json.purchase_status === 'paid') {
        router.replace('/dashboard'); return
      }
      if (i < 12) t = setTimeout(() => poll(i + 1), 800 + 200 * i)
      else router.replace('/paywall') // fallback if webhook never hits
    }
    poll()
    return () => { active = false; if (t) clearTimeout(t) }
  }, [router])
  return <div className="p-8">Finishing up your purchase…</div>
}