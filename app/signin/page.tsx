'use client'
import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseClient'

export default function SignInPage() {
  const sb = supabaseBrowser()
  const router = useRouter()
  const search = useSearchParams()
  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  const [usePhone, setUsePhone] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // where did we come from?
  const from = search.get('from')
  const cameFromOnboarding = useMemo(() => {
    if (from === 'onboarding') return true
    if (typeof document !== 'undefined') {
      try {
        const ref = document.referrer
        if (!ref) return false
        const u = new URL(ref, window.location.origin)
        return u.origin === window.location.origin && u.pathname.startsWith('/onboarding')
      } catch { /* ignore */ }
    }
    return false
  }, [from])

  const goBack = () => {
    // If we came from /account (likely after sign out), skip back to landing
    const ref = document.referrer
    if (ref && ref.includes('/account')) {
      router.push('/')
      return
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    if (cameFromOnboarding) router.push('/onboarding')
    else router.push('/')
  }

  const submit = async () => {
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
      setMsg(e.message || 'Auth failed')
    } finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      {/* Back button (top-left) */}
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
          <h1 className="text-xl font-semibold">{mode === 'signin' ? 'Sign In' : 'Create your account'}</h1>
          <button className="text-sm underline" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Create an account' : 'Have an account? Sign in'}
          </button>
        </div>

        <div className="flex gap-2 text-sm">
          <button className={`px-3 py-1 rounded-full border ${!usePhone ? 'bg-black text-white' : ''}`} onClick={() => setUsePhone(false)}>Email</button>
          <button className={`px-3 py-1 rounded-full border ${usePhone ? 'bg-black text-white' : ''}`} onClick={() => setUsePhone(true)}>Phone</button>
        </div>

        {!usePhone ? (
          <input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-xl border px-4 py-2"/>
        ) : (
          <input type="tel" placeholder="+1 555 123 4567" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-xl border px-4 py-2"/>
        )}

        <input type="password" placeholder="your password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border px-4 py-2"/>

        <button disabled={loading} onClick={submit} className="w-full rounded-xl bg-black text-white py-2">
          {loading ? 'Please wait…' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
        </button>

        {mode === 'signin' && (
          <button
            className="w-full rounded-xl border py-2"
            onClick={async () => {
              if (!email) { setMsg('Enter your email first'); return }
              const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` })
              setMsg(error ? error.message : 'Password reset email sent.')
            }}
          >
            Forgot password?
          </button>
        )}

        {msg && <p className="text-sm text-gray-600">{msg}</p>}
      </div>
    </main>
  )
}