import type { Metadata } from 'next'
import './globals.css'
import ChatWidget from '@/components/chat/ChatWidget' // [ADD]
import DesignStyles from '@/components/DesignStyles'
import ChatGate from "@/components/chat/ChatGate"

export const metadata: Metadata = {
  title: 'marketing mentor ai',
  description: 'let’s build your path to fame | are you ready to be popular?',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-mentor-ui>
        <DesignStyles />
        {children}
        <ChatGate /> {/* shows only when signed in and not on landing */}

      </body>
    </html>
  )
}
