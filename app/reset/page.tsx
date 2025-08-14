
'use client'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [sb, setSb] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
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
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Set a new password</h1>

        <input
          type="password"
          className="w-full rounded-xl border px-4 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
        />

        <button
          className="w-full rounded-xl bg-black text-white py-2 disabled:opacity-60"
          onClick={doUpdate}
          disabled={!sb || !password || loading}
        >
          {loading ? 'Updating…' : 'Update password'}
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