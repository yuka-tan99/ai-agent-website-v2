// app/global-error.tsx
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error('Global error:', error) // shows in browser console
  return (
    <html>
      <body className="min-h-screen grid place-items-center p-6">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <pre className="text-xs text-left whitespace-pre-wrap bg-gray-100 p-3 rounded">
            {error.message}
          </pre>
          <button
            onClick={() => reset()}
            className="mt-4 rounded bg-[#8B6F63] text-white px-4 py-2"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
