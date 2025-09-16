"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignedUpPage() {
  const router = useRouter()
  const [secs, setSecs] = useState(3)

  useEffect(() => {
    let active = true
    const id = setInterval(() => {
      if (!active) return
      setSecs((s) => {
        if (s <= 1) {
          clearInterval(id)
          router.replace('/signin?mode=signin')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { active = false; clearInterval(id) }
  }, [router])

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center dashboard-card p-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Sign Up successful!</h1>
        <p className="mt-3 text-gray-700">Continuing to sign in page in <span className="font-semibold">{secs}s</span>.</p>
        <button
          onClick={() => router.replace('/signin?mode=signin')}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-[var(--accent-grape)] text-white px-5 py-2 hover:bg-[#874E95] transition"
        >
          Click here to redirect now
        </button>
      </div>
    </main>
  )
}

