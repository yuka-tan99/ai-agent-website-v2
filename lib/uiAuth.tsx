// lib/uiAuth.tsx
"use client";

/**
 * Minimal, simulated client-side auth that does NOT change your backend.
 * - We store a tiny "user" in localStorage so flows work without touching Supabase logic.
 * - If you later want, you can swap these helpers to call your real auth endpoints.
 */
import React, { createContext, useContext, useEffect, useState } from "react";

type User = { email: string };

type AuthContextValue = {
  user: User | null;
  loginSim: (u: User) => Promise<void>;
  logoutSim: () => void;
};

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  loginSim: async () => {},
  logoutSim: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Restore simulated session (does not interfere with Supabase)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mm_user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  async function loginSim(u: User) {
    setUser(u);
    localStorage.setItem("mm_user", JSON.stringify(u));
  }
  function logoutSim() {
    setUser(null);
    localStorage.removeItem("mm_user");
  }

  return (
    <AuthCtx.Provider value={{ user, loginSim, logoutSim }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useUiAuth() {
  return useContext(AuthCtx);
}