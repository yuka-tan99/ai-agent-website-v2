'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SignInClient() {
  const router = useRouter()
  const search = useSearchParams()

  // lazy-load supabase browser client
  const [sb, setSb] = useState<any>(null)
  useEffect(() => {
    let mounted = true
    import('@/lib/supabaseClient')
      .then(({ supabaseBrowser }) => { if (mounted) setSb(supabaseBrowser()) })
      .catch((e) => console.warn('supabase client load failed', e))
    return () => { mounted = false }
  }, [])

  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  const [usePhone, setUsePhone] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // detect where we came from
  const fromParam = search.get('from')
  const cameFromOnboarding = useMemo(() => {
    if (fromParam === 'onboarding') return true
    try {
      const ref = document.referrer
      if (!ref) return false
      const u = new URL(ref, window.location.origin)
      return u.origin === window.location.origin && u.pathname.startsWith('/onboarding')
    } catch { return false }
  }, [fromParam])

  const goBack = () => {
    try {
    //   const ref = document.referrer || ''
    //   if (ref.includes('/account')) { router.push('/'); return }
    //   if (cameFromOnboarding) { router.push('/onboarding'); return }
    //   if (window.history.length > 1) { router.back(); return }
      router.push('/')
    } catch {}
    router.push('/')
  }

  const submit = async () => {
    if (!sb) return
    try {
      setLoading(true); setMsg(null)
      if (usePhone) {
        if (mode === 'signup') {
          const { error } = await sb.auth.signUp({ phone, password }); if (error) throw error
          setMsg('Check your phone for confirmation (if enabled).')
        } else {
          const { error } = await sb.auth.signInWithPassword({ phone, password }); if (error) throw error
          router.replace('/account')
        }
      } else {
        if (mode === 'signup') {
          const { error } = await sb.auth.signUp({ email, password }); if (error) throw error
          setMsg('Check your email to confirm your account.')
        } else {
          const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error
          router.replace('/account')
        }
      }
    } catch (e: any) {
      setMsg(e?.message || 'Auth failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      {/* Back button */}
      <div className="absolute left-4 top-4">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-black"
          aria-label="Go back"
        >
          <span aria-hidden>←</span> Back
        </button>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            {mode === 'signin' ? 'Sign In' : 'Create your account'}
          </h1>
          <button
            className="text-sm underline"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? 'Create an account' : 'Have an account? Sign in'}
          </button>
        </div>

        <div className="flex gap-2 text-sm">
          <button
            className={`px-3 py-1 rounded-full border ${!usePhone ? 'bg-black text-white' : ''}`}
            onClick={() => setUsePhone(false)}
          >
            Email
          </button>
          <button
            className={`px-3 py-1 rounded-full border ${usePhone ? 'bg-black text-white' : ''}`}
            onClick={() => setUsePhone(true)}
          >
            Phone
          </button>
        </div>

        {!usePhone ? (
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="w-full rounded-xl border px-4 py-2"
          />
        ) : (
          <input
            type="tel"
            placeholder="+1 555 123 4567"
            value={phone}
            onChange={(e)=>setPhone(e.target.value)}
            className="w-full rounded-xl border px-4 py-2"
          />
        )}

        <input
          type="password"
          placeholder="your password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          className="w-full rounded-xl border px-4 py-2"
        />

        <button
          disabled={loading || !sb}
          onClick={submit}
          className="w-full rounded-xl bg-black text-white py-2 disabled:opacity-60"
        >
          {loading ? 'Please wait…' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
        </button>

        {mode === 'signin' && (
          <button
            className="w-full rounded-xl border py-2 disabled:opacity-60"
            disabled={!sb}
            onClick={async () => {
              if (!email) { setMsg('Enter your email first'); return }
              const { error } = await sb.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset`,
              })
              setMsg(error ? error.message : 'Password reset email sent.')
            }}
          >
            Forgot password?
          </button>
        )}

        {msg && <p className="text-sm text-gray-600">{msg}</p>}
        {!sb && <p className="text-xs text-gray-400">Initializing…</p>}
      </div>
    </main>
  )
}