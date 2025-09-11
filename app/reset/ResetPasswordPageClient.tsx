
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [sb, setSb] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  // Only load Supabase browser client in the browser
  useEffect(() => {
    let mounted = true
    import('@/lib/supabaseClient')
      .then(({ supabaseBrowser }) => {
        if (mounted) setSb(supabaseBrowser())
      })
      .catch((e) => {
        console.warn('Failed to load supabase client:', e)
      })
    return () => { mounted = false }
  }, [])

  const doUpdate = async () => {
    if (!sb || !password) return
    try {
      setLoading(true)
      setMsg(null)
      if (!password || password.length < 8) {
        setMsg('Password must be at least 8 characters.')
        return
      }
      if (password !== confirm) {
        setMsg('Passwords do not match.')
        return
      }
      const { error } = await sb.auth.updateUser({ password })
      if (error) setMsg(error.message)
      else {
        setMsg('Password updated.')
        setTimeout(() => router.replace('/account'), 800)
      }
    } catch (e: any) {
      setMsg(e?.message || 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f9fafb] px-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Reset your password</h1>

        <input
          type="password"
          className="w-full rounded-xl border px-4 py-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
        />
        <input
          type="password"
          className="w-full rounded-xl border px-4 py-3"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
        />

        <button
          className="w-full rounded-xl bg-[var(--accent-grape)] text-white py-3 disabled:opacity-60"
          onClick={doUpdate}
          disabled={!sb || !password || !confirm || loading}
        >
          {loading ? 'Updating…' : 'Change password'}
        </button>

        {msg && <p className="text-sm text-gray-600">{msg}</p>}

        {!sb && (
          <p className="text-xs text-gray-400">
            Initializing…
          </p>
        )}
      </div>
    </main>
  )
}
