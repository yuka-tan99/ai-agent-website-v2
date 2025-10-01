import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  // No-op analytics endpoint to avoid 404s in dev. You can persist if desired.
  return NextResponse.json({ ok: true })
}
