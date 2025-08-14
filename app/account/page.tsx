// app/account/page.tsx  (SERVER WRAPPER)
export const dynamic = 'force-dynamic'   // ok on server files
// no `revalidate` export here — not needed

import AccountPageClient from './AccountPageClient'

export default function Page() {
  return <AccountPageClient />
}