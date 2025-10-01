// components/chat/ChatGate.tsx
"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabaseClient"
import ChatWidget from "./ChatWidget"

export default function ChatGate() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const sb = supabaseBrowser()

    // Initial check
    sb.auth.getUser().then(({ data }) => setAuthed(!!data.user))

    // Listen for auth changes (sign in/out)
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Hide widget until auth state is known
  if (authed !== true) return null

  // Optionally hide on specific paths
  if (
    pathname === "/" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/paywall")
  ) {
    return null
  }
  // Public routes (no chat)
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/paywall")

  // Keep chat on dashboard/report pages per new UX
  if (isPublic) return null

  return <ChatWidget />
}
