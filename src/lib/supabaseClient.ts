import { createClient } from "@supabase/supabase-js";

const resolveEnvValue = (
  ...values: Array<string | undefined | null>
): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
};

const supabaseUrl = resolveEnvValue(
  typeof process !== "undefined"
    ? (process.env?.NEXT_PUBLIC_SUPABASE_URL as string | undefined)
    : undefined,
  typeof process !== "undefined"
    ? (process.env?.VITE_SUPABASE_URL as string | undefined)
    : undefined,
  typeof window !== "undefined"
    ? (
        (window as unknown as { __SUPABASE_URL__?: string })
          .__SUPABASE_URL__ as string | undefined
      )
    : undefined,
);

const supabaseAnonKey = resolveEnvValue(
  typeof process !== "undefined"
    ? (process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined)
    : undefined,
  typeof process !== "undefined"
    ? (process.env?.VITE_SUPABASE_ANON_KEY as string | undefined)
    : undefined,
  typeof window !== "undefined"
    ? (
        (window as unknown as { __SUPABASE_ANON_KEY__?: string })
          .__SUPABASE_ANON_KEY__ as string | undefined
      )
    : undefined,
);

if (!supabaseUrl) {
  throw new Error(
    "Missing Supabase URL. Set VITE_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) in your .env.local file.",
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing Supabase anon key. Set VITE_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in your .env.local file.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
});
