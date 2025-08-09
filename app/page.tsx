import Link from 'next/link'

export default function Home() {
  return (
    <main className="container py-16">
      <h1 className="text-4xl font-semibold mb-4 tracking-tight">AI Fame Coach</h1>
      <p className="mb-8 max-w-2xl text-lg">
        A clean, no‑BS growth plan with an interactive, data‑style dashboard.
      </p>
      <div className="flex gap-3">
        <Link href="/signin" className="px-6 py-3 rounded-xl border">Sign in</Link>
        <Link href="/onboarding" className="px-6 py-3 rounded-xl bg-black text-white">Get Started</Link>
      </div>
    </main>
  )
}
