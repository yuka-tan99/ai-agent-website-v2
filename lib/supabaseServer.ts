// lib/supabaseServer.ts
import { cookies } from "next/headers";
import {
  createServerComponentClient,
  createRouteHandlerClient,
} from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

// For server components (pages/layouts)
export const supabaseServer = () =>
  createServerComponentClient({ cookies });

// For API routes (auth based on cookies)
export const supabaseRoute = () =>
  createRouteHandlerClient({ cookies });

// For background / dev bypass (service role)
export const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,     // set in .env.local
  );
