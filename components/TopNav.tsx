// components/TopNav.tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function TopNav() {
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    let mounted = true;

    // Prefer cached name immediately to avoid flicker
    try {
      const cached = localStorage.getItem('profile_name');
      if (cached && mounted) setName(cached);
    } catch {}

    // prime immediately to avoid flicker
    sb.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const u = data.user;
      setEmail(u?.email ?? null);
      const meta: any = u?.user_metadata || {};
      const metaName = (meta.name || meta.full_name || '').toString();
      if (metaName) {
        setName(metaName);
        try { localStorage.setItem('profile_name', metaName); } catch {}
      }
    });

    const sub = sb.auth.onAuthStateChange((_e, s) => {
      setEmail(s?.user?.email ?? null);
      const meta: any = s?.user?.user_metadata || {};
      const metaName = (meta.name || meta.full_name || '').toString();
      if (metaName) {
        setName(metaName);
        try { localStorage.setItem('profile_name', metaName); } catch {}
      }
    });

    return () => {
      mounted = false;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'profile_name' && typeof e.newValue === 'string') {
        setName(e.newValue || null);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
<header className="fixed top-0 left-0 right-0 z-40 h-14 bg-[#f9fafb]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand (click → landing if logged out, /account if logged in) */}
        <Link
          href={email ? "/account" : "/"}
          className="font-bold text-sm md:text-base tracking-tight text-gray-900"
        >
          marketing mentor ai
        </Link>

        {/* Right side */}
        {!email ? (
          <nav className="flex items-center gap-3">
            <Link
              href="/signin?mode=signin"
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-100 transition"
            >
              Log In
            </Link>
            {/* optional: hide Sign Up for now; comment back in when you want it visible */}
            {/* <Link href="/signin?mode=signup" className="px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800 transition">Sign Up</Link> */}
          </nav>
        ) : (
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-700 hidden sm:block">
              {`welcome, ${(() => {
                const n = (name || '').trim();
                if (n) return n;
                const alias = (email || '').split('@')[0] || '';
                const pretty = alias.replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                return pretty || 'friend';
              })()}`}
            </div>
            <Link
              href="/account"
              aria-label="Go to account"
              className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-gray-200 transition-colors"
              title={email || undefined}
            >
              {/* minimalist avatar glyph */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 20c1.6-3.2 4.8-5 8-5s6.4 1.8 8 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
