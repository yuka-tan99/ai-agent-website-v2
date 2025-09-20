export const dynamic = 'force-dynamic'

import Link from 'next/link'

export default function LearnTopicPage({ params }: { params: { topic: string } }) {
  const { topic } = params
  const title = (topic || '').replace(/-/g, ' ')
  return (
    <main className="container py-10">
      <div className="mb-4">
        <Link href="/dashboard" className="inline-flex items-center h-11 px-2 rounded-md gap-2 text-base text-gray-700 hover:text-[var(--accent-grape)] hover:font-semibold transition-colors">
          ← back
        </Link>
      </div>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">{title}</h1>
        <div className="dashboard-card p-6 text-gray-600">
          This section will have deeper guidance soon.
        </div>
      </div>
    </main>
  )
}
