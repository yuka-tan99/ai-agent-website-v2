"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { redirect, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseClient'
import ReportSummary from '@/components/report/ReportSummary'

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_PLAN === "true";
if (DEV_BYPASS) {
  redirect("/dashboard"); // 👈 skip paywall entirely in dev/preview
}

export default function Paywall(){
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planPreview, setPlanPreview] = useState<any>(null)
  // Avoid hitting the LLM on paywall by default to reduce rate limit pressure
  const PREVIEW_LLM = process.env.NEXT_PUBLIC_PAYWALL_PREVIEW_LLM === 'true'

  // Poll purchase_status to auto-unlock once paid
  useEffect(() => {
    const sb = supabaseBrowser()
    let cancel = false
    ;(async () => {
      const { data: { user } } = await sb.auth.getUser()
      const uid = user?.id
      if (!uid) return
      async function checkOnce() {
        try {
          const { data } = await sb
            .from('onboarding_sessions')
            .select('purchase_status')
            .eq('user_id', uid)
            .maybeSingle()
          if (!cancel && data?.purchase_status === 'paid') {
            router.replace('/dashboard')
          }
        } catch {}
      }
      await checkOnce()
      const id = setInterval(checkOnce, 2500)
      const t = setTimeout(() => clearInterval(id), 30000) // stop after 30s
      return () => { clearInterval(id); clearTimeout(t) }
    })()
    return () => { cancel = true }
  }, [router])

  useEffect(() => {
    if (!PREVIEW_LLM) return; // show static blurred UI; skip LLM call
    (async () => {
      try {
        const persona = JSON.parse(localStorage.getItem('onboarding') || '{}')
        const res = await fetch('/api/plan', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persona })
        })
        const data = await res.json()
        setPlanPreview(data)
      } catch {
        // ignore preview errors
      }
    })()
  }, [PREVIEW_LLM])

  const checkout = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout?product=plan', { method: 'POST' })
      const data = await res.json().catch(() => ({}))

      if (res.status === 401) {
        setError('Please sign in to continue.')
        router.push('/signin')
        return
      }
      if (res.ok && data?.url) {
        window.location.href = data.url
        return
      }
      setError(data?.error || 'Unable to start checkout. Check your Stripe env vars.')
    } catch (e: any) {
      setError(e.message || 'Unexpected error starting checkout.')
    } finally {
      setLoading(false)
    }
  }

  // lightweight template plan if we skip LLM
  const templatePlan = planPreview?.plan || {
    fame_score: 62,
    fame_breakdown: [
      { key: 'consistency', label: 'Consistency', percent: 14 },
      { key: 'camera_comfort', label: 'Camera comfort', percent: 12 },
      { key: 'planning', label: 'Planning', percent: 11 },
      { key: 'tech_comfort', label: 'Tech comfort', percent: 9 },
      { key: 'audience_readiness', label: 'Audience readiness', percent: 7 },
      { key: 'interest_breadth', label: 'Interest breadth', percent: 5 },
      { key: 'experimention', label: 'Experimentation', percent: 8 },
    ],
    main_problem: 'inconsistent posting',
    main_problem_detail: 'Your momentum stalls when you skip publishing days. A small, repeatable cadence will unlock algorithm trust and let you learn faster from each post.',
    sections: {
      ai_marketing_psychology: { summary: 'Use simple psychology to make posts easy to watch and share.', bullets: ['Lead with outcome', 'Cut slow intros', 'Ask one clear question'] },
      foundational_psychology: { summary: 'Repeat recognizable formats and show quick wins.', bullets: ['Pick 3 pillars', 'Reuse hooks', 'Show proof'] },
      platform_specific_strategies: { summary: 'Mirror pacing of top posts on the one platform you can post daily.', bullets: ['Borrow pacing', 'Remix to Shorts/Reels/TikTok'], charts: { platform_focus: [{ name:'TikTok', value:40 }, { name:'Instagram', value:30 }, { name:'YouTube', value:20 }, { name:'Pinterest', value:10 }] } },
      content_strategy: { summary: 'Create 2–3 repeatable formats to reduce decision fatigue.', bullets: ['Define formats', 'Keep a swipe file', 'Batch on Sunday'] },
      posting_frequency: { summary: 'Short and frequent beats rare and long while learning.', bullets: ['1 small post a day for 14 days'] },
      metrics_mindset: { summary: 'Study the first 2 seconds. Duplicate what holds attention.', bullets: ['Track posts/week & 2s retention'] },
      mental_health: { summary: 'Treat each post as an experiment, not a verdict.', bullets: ['Set a 20‑min publish window'] },
    },
  }

  return (
    <main className="container py-10">
      <div className="relative">
        {/* Blurred preview of the actual report template */}
        <div className="pointer-events-none select-none rounded-2xl border overflow-hidden">
          <div className="opacity-40 blur-sm">
            <ReportSummary plan={templatePlan} />
          </div>
        </div>

        {/* Center CTA overlay */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center rounded-2xl bg-white/90 backdrop-blur-md border shadow-xl p-6">
            <h2 className="text-2xl font-semibold mb-2">unlock your full report</h2>
            <p className="text-gray-600 mb-5">One-time $39. Instantly unblur and access your personalized strategy.</p>
            <button
              onClick={checkout}
              className="w-full px-6 py-3 rounded-xl bg-[#6237A0] text-white disabled:opacity-60 hover:bg-[#4F2D82]"
              disabled={loading}
            >
              {loading ? 'Redirecting…' : 'unlock your full report'}
            </button>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            <div className="mt-3 text-xs text-gray-500">Already purchased? <Link className="underline" href="/dashboard">Go to dashboard</Link></div>
          </div>
        </div>
      </div>
    </main>
  )
}
