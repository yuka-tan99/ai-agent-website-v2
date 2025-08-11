import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-white text-center px-4">
      <div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-gray-900">
          marketing mentor ai
        </h1>
        <p className="mb-8 max-w-xl mx-auto text-lg text-gray-600">
          let’s build your path to fame | are you ready to be popular?
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/signin"
            className="px-6 py-3 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-100 transition"
          >
            Sign in
          </Link>
          <Link
            href="/onboarding"
            className="px-6 py-3 rounded-xl bg-black text-white hover:bg-gray-800 transition"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  )
}

