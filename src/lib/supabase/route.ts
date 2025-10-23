import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

type RouteClient = {
  client: SupabaseClient;
  accessToken: string | null;
  getUser: SupabaseClient["auth"]["getUser"];
};

const PROJECT_REF =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
    /https?:\/\/([a-zA-Z0-9-]+)\.supabase\.co/,
  )?.[1] ?? "";

const COOKIE_NAME = PROJECT_REF
  ? `sb-${PROJECT_REF}-auth-token`
  : undefined;

function extractAccessToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7);
  }

  const fallbackHeader = req.headers.get("x-supabase-access-token");
  if (fallbackHeader) {
    return fallbackHeader;
  }

  if (COOKIE_NAME) {
    const authCookie = req.cookies.get(COOKIE_NAME)?.value;
    if (authCookie) {
      try {
        const parsed = JSON.parse(authCookie);
        if (Array.isArray(parsed) && typeof parsed[0] === "string") {
          return parsed[0];
        }
      } catch {
        // ignore malformed cookie
      }
    }
  }

  return null;
}

export function supabaseRoute(req: NextRequest): RouteClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  const client = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const accessToken = extractAccessToken(req);

  return {
    client,
    accessToken,
    getUser: (jwt) => {
      if (jwt || accessToken) {
        return client.auth.getUser(jwt ?? accessToken!);
      }
      return client.auth.getUser();
    },
  };
}
