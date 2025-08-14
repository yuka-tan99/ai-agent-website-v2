'use client'
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const sb = supabaseBrowser()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <input type="password" className="w-full rounded-xl border px-4 py-2" value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password"/>
        <button
          className="w-full rounded-xl bg-black text-white py-2"
          onClick={async () => {
            const { error } = await sb.auth.updateUser({ password })
            if (error) setMsg(error.message)
            else { setMsg('Password updated.'); setTimeout(()=>router.replace('/account'), 800) }
          }}
        >
          Update password
        </button>
        {msg && <p className="text-sm text-gray-600">{msg}</p>}
      </div>
    </main>
  )
}