'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseClient'
import Link from 'next/link'
import LandingHero from '@/components/LandingHero'
import DesignStyles from '@/components/DesignStyles'

export default function Home() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    const sb = supabaseBrowser()

    // check current session
    sb.auth.getUser().then(({ data }) => {
      const u = data.user
      setAuthed(!!u)
      setEmail(u?.email || '')
    })

    // listen to auth changes
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      const u = s?.user
      setAuthed(!!u)
      setEmail(u?.email || '')
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <div data-mentor-ui>
      <DesignStyles />

      <main className="min-h-screen flex flex-col items-center bg-white pt-12">
        {/* Top-left brand, headline, animated subline (matches your video) */}
        <LandingHero />

        {/* Buttons only (lifted up, wording unchanged) */}
        <div className="flex items-center gap-4 mt-6">
          <Link
            href="/signin"
            className="px-6 py-4 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-100 transition transform hover:scale-[1.03]"
          >
            sign in
          </Link>
          <Link
            href="/onboarding"
            className="px-6 py-4 rounded-xl bg-black text-white hover:bg-gray-800 transition transform hover:scale-[1.03] pulse-gentle"
          >
            let's start
          </Link>
        </div>
      </main>
    </div>
  )
}