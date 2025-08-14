'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseClient'

export default function SignInPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  const [usePhone, setUsePhone] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [sb, setSb] = useState<ReturnType<typeof supabaseBrowser> | null>(null)

  // ✅ Only initialize Supabase client on client side
  useEffect(() => {
    setSb(supabaseBrowser())
  }, [])

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
      setMsg(e.message || 'Auth failed')
    } finally {
      setLoading(false)
    }
  }

  if (!sb) return null // wait for client init

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
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
          <input type="email" placeholder="you@example.com" value={email}
            onChange={e=>setEmail(e.target.value)}
            className="w-full rounded-xl border px-4 py-2"/>
        ) : (
          <input type="tel" placeholder="+1 555 123 4567" value={phone}
            onChange={e=>setPhone(e.target.value)}
            className="w-full rounded-xl border px-4 py-2"/>
        )}

        <input type="password" placeholder="your password" value={password}
          onChange={e=>setPassword(e.target.value)}
          className="w-full rounded-xl border px-4 py-2"/>

        <button disabled={loading} onClick={submit}
          className="w-full rounded-xl bg-black text-white py-2">
          {loading ? 'Please wait…' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
        </button>

        {mode === 'signin' && (
          <button
            className="w-full rounded-xl border py-2"
            onClick={async () => {
              if (!email) { setMsg('Enter your email first'); return }
              const { error } = await sb.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset`
              })
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