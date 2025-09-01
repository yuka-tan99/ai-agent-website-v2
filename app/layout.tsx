// app/layout.tsx
export const dynamic = 'force-dynamic'; // keep for Vercel

import type { Metadata } from 'next'
import './globals.css'
import DesignStyles from '@/components/DesignStyles'
import { AuthProvider } from "@/lib/uiAuth";
import TopNav from "@/components/TopNav";
import { ReactNode } from 'react'

// IMPORTANT: do NOT import ChatWidget directly in a server file.
// Use a client-only dynamic import for the gate.
import nextDynamic from 'next/dynamic'
const ChatGate = nextDynamic(() => import('@/components/chat/ChatGate'), { ssr: false })

export const metadata: Metadata = {
  title: 'marketing mentor ai',
  description: 'let’s build your path to fame | are you ready to be popular?',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body data-mentor-ui>
        <AuthProvider>
          <DesignStyles />
          <TopNav />
          <main className="min-h-screen pt-[56px]">{children}</main>

          {/* Mount ONCE globally so it persists across navigation.
             Your ChatGate already hides on /, /signin*, /onboarding*, and /dashboard (report). */}
          <ChatGate />
        </AuthProvider>
      </body>
    </html>
  );
}