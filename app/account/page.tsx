'use client'
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseClient'

type OnboardingStatus = { complete: boolean }

export default function AccountPage() {
  const sb = supabaseBrowser()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [hasReport, setHasReport] = useState(false)
  const [obComplete, setObComplete] = useState(false)
  const [genLoading, setGenLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data } = await sb.auth.getUser()
      if (!data.user) { router.replace('/signin'); return }
      setEmail(data.user.email || '')

      // 1) Try to ATTACH local anonymous onboarding session to this user
      try {
        const localSid = typeof window !== 'undefined' ? localStorage.getItem('onboarding_session_id') : null
        if (localSid) {
          await fetch('/api/onboarding/attach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: localSid }),
            cache: 'no-store',
          })
          // No need to block UI on errors here; we’ll just proceed to checks
        }
      } catch {}

      // 2) check if report exists
      try {
        const rep = await fetch('/api/report', { cache: 'no-store' })
        if (rep.ok) {
          const j = await rep.json()
          setHasReport(!!j?.plan)
        } else if (rep.status === 404) {
          setHasReport(false)
        }
      } catch {
        setHasReport(false)
      }

      // 3) check onboarding completion (now that session is attached)
      try {
        const ob = await fetch('/api/onboarding/status', { cache: 'no-store' })
        if (ob.ok) {
          const j = (await ob.json()) as OnboardingStatus
          setObComplete(!!j.complete)
        } else {
          setObComplete(false)
        }
      } catch {
        setObComplete(false)
      }

      setLoading(false)
    })()
  }, [])

  const generateNow = async () => {
    setGenLoading(true)
    try {
      const res = await fetch('/api/plan', { method: 'POST', cache: 'no-store' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j?.error || 'Failed to generate report. Complete onboarding first.')
        return
      }
      router.push('/dashboard')
    } finally {
      setGenLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">{email ? `Welcome — ${email}` : 'Welcome'}</h1>

      {hasReport ? (
        <button onClick={() => router.push('/dashboard')} className="px-6 py-3 rounded-xl bg-black text-white">
          View my result
        </button>
      ) : obComplete ? (
        <button
          disabled={genLoading}
          onClick={generateNow}
          className="px-6 py-3 rounded-xl bg-black text-white disabled:opacity-60"
        >
          {genLoading ? 'Generating…' : 'Generate my result'}
        </button>
      ) : (
        <button onClick={() => router.push('/onboarding')} className="px-6 py-3 rounded-xl bg-black text-white">
          Get Started
        </button>
      )}

      <button
        onClick={async () => {
          if (!email) return
          const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` })
          alert(error ? error.message : 'Check your email for the reset link.')
        }}
        className="px-6 py-3 rounded-xl border"
      >
        Reset my password
      </button>

      <button
        onClick={async () => { await sb.auth.signOut(); router.replace('/signin') }}
        className="px-6 py-3 rounded-xl border"
      >
        Sign out
      </button>
    </main>
  )
}