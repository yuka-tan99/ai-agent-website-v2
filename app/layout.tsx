import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'marketing mentor ai',
  description: 'let’s build your path to fame | are you ready to be popular?',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
