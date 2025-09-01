// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // This ensures the server (including /api routes) has an up-to-date session cookie.
  const supabase = createMiddlewareClient({ req, res });
  await supabase.auth.getSession();

  return res;
}

export const config = {
  matcher: [
    /*
      Run on everything under / (including /api/*).
      If you want to scope it, you can refine the matcher.
    */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};