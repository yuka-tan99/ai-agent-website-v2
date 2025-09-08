export const dynamic = 'force-dynamic'
import nextDynamic from 'next/dynamic'

const AccountPage = nextDynamic(() => import('@/components/AccountPageClient'), {
  ssr: false,
  loading: () => (
    <main className="flex items-center justify-center min-h-[50vh] py-12">
      <span className="text-gray-700 font-semibold" aria-live="polite" aria-busy="true">...</span>
    </main>
  ),
})

export default function RewardsPage() {
  return <AccountPage section="rewards" />
}
