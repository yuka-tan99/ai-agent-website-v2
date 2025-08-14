// app/signin/page.tsx
export const dynamic = 'force-dynamic'
export const revalidate = 0 // or `false` — both are fine here because this is a server file

import SignInClient from './SignInClient'

export default function Page() {
  return <SignInClient />
}