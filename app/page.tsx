'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseClient'
import Link from 'next/link'
import LandingHero from '@/components/LandingHero'
import FooterReveal from '@/components/FooterReveal'
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
      <main className="relative min-h-screen flex flex-col items-center landing-orchid-bg pt-12">

        {/* Top-right auth buttons (keep routes; only labels changed) */}


        {/* Hero */}
        <LandingHero />

        {/* Centered single CTA (removed the middle Log In button) */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/onboarding"
            className="w-full sm:w-auto text-center px-10 py-5 rounded-full bg-[var(--accent-grape)] text-white hover:bg-[#874E95] shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent-grape)] transition transform hover:scale-[1.03] pulse-gentle text-xl md:text-2xl font-semibold tracking-tight"
          >
            Let&apos;s Start
          </Link>
        </div>
      </main>
      {/* Smooth reveal footer */}
      <FooterReveal />
    </div>
  )
}
