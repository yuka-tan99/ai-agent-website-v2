import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

// Creates a brand-new anonymous onboarding session cookie and clears any cached “answers”.
export async function POST() {
  const id = randomUUID();

  // overwrite cookie
  cookies().set({
    name: 'ob_session',
    value: id,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14, // 14d
  });

  // optional: tell the client what we created
  return NextResponse.json({ sessionId: id });
}