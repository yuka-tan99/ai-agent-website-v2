'use client'
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseClient'

export default function SignIn(){
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string|undefined>()

  const sendLink = async () => {
    setError(undefined)
    const sb = supabaseBrowser()
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` }
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <main className="container py-16 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"
        className="w-full border rounded-xl px-4 py-3 mb-3" />
      <button onClick={sendLink} className="px-6 py-3 rounded-xl bg-black text-white w-full">Send magic link</button>
      {sent && <p className="mt-4 text-green-700">Link sent. Check your email.</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}
    </main>
  )
}
