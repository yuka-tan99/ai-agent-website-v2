import ReportBoard from '@/components/report/ReportBoard'
import Link from 'next/link'

export default function ReportBoardPage() {
  return (
    <main className="container py-10 relative">
      <div className="fixed top-[calc(var(--navH,56px)+8px)] left-6 z-40">
        <Link href="/dashboard" className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 inline-flex items-center justify-center text-gray-900 border border-gray-100" aria-label="Back to dashboard">←</Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">your report</h1>
      <ReportBoard />
    </main>
  )
}
