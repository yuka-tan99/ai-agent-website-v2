export const dynamic = 'force-dynamic'

import AccountPageClient from '@/components/AccountPageClient'
import nextDynamic from 'next/dynamic';


export default function Page() {
  return (
    <>
      <AccountPageClient /> {/* defaults to 'usage' */}
      {/* <ChatGate />          shows chat only when authed; hidden on /, /onboarding, /signin */}
    </>
  )
}