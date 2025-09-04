'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseClient'
import { useRouter, usePathname } from 'next/navigation'

export default function Header() {
  const sb = supabaseBrowser()
  const router = useRouter()
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)

  // Hide header only on the root landing page
  if (pathname === '/') return null

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => setAuthed(!!data.user))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) =>
      setAuthed(!!s?.user)
    )
    return () => sub.subscription.unsubscribe()
  }, [sb])

  return (
    <header className="w-full flex items-center justify-between px-6 py-4">
      <Link href="/" className="font-semibold">
        marketing mentor ai
      </Link>
      {!authed ? (
        <div className="flex items-center gap-3">
          <Link
            href="/signin"
            className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 transition"
          >
            Sign In
          </Link>
          <button
            className="px-4 py-2 rounded-xl bg-[#6237A0] text-white hover:bg-[#4F2D82] transition"
            onClick={() => router.push('/signin')}
          >
            Get started
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 transition"
          >
            Account
          </Link>
          <button
            className="px-4 py-2 rounded-xl hover:bg-gray-100 transition"
            onClick={async () => {
              await sb.auth.signOut()
              router.refresh()
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
