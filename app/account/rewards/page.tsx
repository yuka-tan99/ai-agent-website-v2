export const dynamic = 'force-dynamic'
import AccountPageClient from '@/components/AccountPageClient'

import nextDynamic from 'next/dynamic'

export default function RewardsPage() {
  return (
  <>
    <AccountPageClient section="rewards" />
  </>
    )
}