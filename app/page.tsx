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

      {/* make this relative so we can absolutely position the top-right buttons */}
      <main className="relative min-h-screen flex flex-col items-center bg-[#f9fafb] pt-12">

        {/* Top-right auth buttons (keep routes; only labels changed) */}


        {/* Hero */}
        <LandingHero />

        {/* Centered single CTA (removed the middle Log In button) */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/onboarding"
            className="px-8 py-3.5 rounded-full bg-[var(--accent-grape)] text-white hover:bg-[#874E95] transition transform hover:scale-[1.03] pulse-gentle text-lg"
          >
            Let&apos;s Start
          </Link>
        </div>
      </main>
    </div>
  )
}
