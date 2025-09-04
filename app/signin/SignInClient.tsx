'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SignInClient() {
  const router = useRouter()
  const search = useSearchParams()

  // supabase
  const [sb, setSb] = useState<any>(null)
  useEffect(() => {
    let mounted = true
    import('@/lib/supabaseClient')
      .then(({ supabaseBrowser }) => { if (mounted) setSb(supabaseBrowser()) })
      .catch((e) => console.warn('supabase client load failed', e))
    return () => { mounted = false }
  }, [])

  // mode from query (?mode=signin|signup)
  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  useEffect(() => {
    const m = (search.get('mode') || '').toLowerCase()
    if (m === 'signup') setMode('signup')
    else if (m === 'signin') setMode('signin')
  }, [search])

  const [usePhone, setUsePhone] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('') // only used in signup mode
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // (kept for parity, but not used for back nav anymore)
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

  const goBack = () => router.push('/')

  // OAuth helpers (safe no-op if not configured)
  const oauth = async (provider: 'google'|'azure'|'apple') => {
    if (!sb?.auth?.signInWithOAuth) {
      setMsg('OAuth not configured in this environment.')
      return
    }
    try {
      setLoading(true); setMsg(null)
      const redirectTo = `${window.location.origin}/auth/callback`
      const { data, error } = await sb.auth.signInWithOAuth({
        provider: provider === 'azure' ? 'azure' : provider, // supabase provider keys
        options: { redirectTo }
      })
      if (error) throw error
      // redirect handled by supabase; nothing else here
    } catch (e:any) {
      setMsg(e?.message || 'OAuth failed')
    } finally { setLoading(false) }
  }

  const submit = async () => {
    if (!sb) return
    try {
      setLoading(true); setMsg(null)

      if (!password) { setMsg('Please enter your password.'); return }
      if (usePhone) {
        if (!phone) { setMsg('Please enter your phone number.'); return }
      } else {
        if (!email) { setMsg('Please enter your email.'); return }
      }

      if (mode === 'signup') {
        // simple frontend confirm check (backend unchanged)
        if (!usePhone && confirm && confirm !== password) {
          setMsg('Passwords do not match.')
          return
        }
      }

      if (usePhone) {
        if (mode === 'signup') {
          const { error } = await sb.auth.signUp({ phone, password })
          if (error) throw error
          setMsg('Check your phone for confirmation (if enabled).')
          return
        } else {
          const { error } = await sb.auth.signInWithPassword({ phone, password })
          if (error) throw error
          router.replace('/account')
          return
        }
      } else {
        if (mode === 'signup') {
          const redirectTo = `${window.location.origin}/auth/callback`
          const { error } = await sb.auth.signUp(
            { email, password },
            { emailRedirectTo: redirectTo }
          )
          if (error) throw error
          setMsg('Check your email to confirm your account.')
          return
        } else {
          const { error } = await sb.auth.signInWithPassword({ email, password })
          if (error) throw error
          router.replace('/account')
          return
        }
      }
    } catch (e:any) {
      setMsg(e?.message || 'Auth failed')
    } finally {
      setLoading(false)
    }
  }

  // Shared bits
  const Title = mode === 'signin' ? 'Sign In' : 'Create Account'
  const PrimaryCta = mode === 'signin' ? 'Log In' : 'Sign Up'

  return (
<main className="min-h-screen flex items-center justify-center bg-[#f9fafb] px-4 pt-6 md:pt-8">
      {/* Top bar brand (use your existing nav if present; this is just a spacer) */}
      {/* <div className="h-14 flex items-center justify-between px-4">
        <div className="font-bold text-sm md:text-base">marketing mentor ai</div>
        <button onClick={goBack} className="text-sm text-gray-600 hover:text-black">Back</button>
      </div> */}

      <section className="max-w-md mx-auto px-4 pb-16">
        {/* Title */}
        <h1 className="text-2xl font-semibold text-center mb-6">{Title}</h1>

        {/* Provider buttons */}
        <div className="space-y-3">
          <button
            onClick={() => oauth('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border py-3 hover:bg-gray-50 disabled:opacity-60"
          >
            <img alt="" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-5 w-5" />
            <span>Continue with Google</span>
          </button>
          <button
            onClick={() => oauth('azure')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border py-3 hover:bg-gray-50 disabled:opacity-60"
          >
            <img alt="" src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/microsoft.svg" className="h-5 w-5" />
            <span>Continue with Microsoft</span>
          </button>
          <button
            onClick={() => oauth('apple')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border py-3 hover:bg-gray-50 disabled:opacity-60"
          >
            <img alt="" src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/apple.svg" className="h-5 w-5" />
            <span>Continue with Apple</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-sm text-gray-500">OR</span>
          </div>
        </div>

        {/* Sub-links under title (match screenshot behavior) */}
        {mode === 'signin' ? (
          <div className="text-center mb-6 space-y-1">
            <button
              onClick={() => setMode('signin')}
              className="text-indigo-600 hover:underline text-sm"
            >
              Other ways to log in
            </button>
            <div className="text-sm">
              or{' '}
              <a href="/signin?mode=signup" className="text-indigo-600 hover:underline">
                Create Account
              </a>
            </div>
          </div>
        ) : null}

        {/* Email / Phone toggle */}
        <div className="flex gap-2 text-sm justify-center mb-4">
          <button
            className={`px-3 py-1 rounded-full border ${!usePhone ? 'bg-[#6237A0] text-white' : ''}`}
            onClick={() => setUsePhone(false)}
          >
            Email
          </button>
          <button
            className={`px-3 py-1 rounded-full border ${usePhone ? 'bg-[#6237A0] text-white' : ''}`}
            onClick={() => setUsePhone(true)}
          >
            Phone
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          {!usePhone ? (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            />
          ) : (
            <input
              type="tel"
              placeholder="Phone"
              value={phone}
              onChange={(e)=>setPhone(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            />
          )}

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
          />

          {mode === 'signup' && !usePhone && (
            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e)=>setConfirm(e.target.value)}
              className="w-full rounded-xl border px-4 py-3"
            />
          )}
        </div>

        {/* Submit */}
        <button
          disabled={loading || !sb}
          onClick={submit}
          className="mt-4 w-full rounded-xl bg-[#6237A0] text-white py-3 disabled:opacity-60"
        >
          {loading ? 'Please wait…' : PrimaryCta}
        </button>

        {/* Forgot link in signin mode */}
        {mode === 'signin' && (
          <button
            className="mt-3 w-full rounded-xl border py-3 disabled:opacity-60"
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

        {/* Footer prompt under signup form */}
        {mode === 'signup' && (
          <p className="mt-4 text-sm text-gray-600 text-center">
            Already have an account?{' '}
            <a href="/signin?mode=signin" className="underline">Log in</a>
          </p>
        )}

        {msg && <p className="mt-4 text-sm text-gray-600 text-center">{msg}</p>}
        {!sb && <p className="mt-2 text-xs text-gray-400 text-center">Initializing…</p>}
      </section>
    </main>
  )
}
