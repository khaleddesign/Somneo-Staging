'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to a tracking service (Sentry, LogRocket, etc.)
    console.error('[Global Error]', error)
  }, [error])

  return (
    <html lang="fr">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f0f4f8] p-4 text-center font-body">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
            <h2 className="text-2xl font-display text-midnight mb-4">Error Critique</h2>
            <p className="text-gray-600 mb-6">
              An unexpected application error occurred. We apologize for the inconvenience.
            </p>
            <button
              onClick={() => reset()}
              className="w-full bg-teal text-white py-3 px-4 rounded-xl font-heading hover:bg-teal/90 transition-colors"
            >
              Tenter de recharger la page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 text-left p-4 bg-red-50 text-red-900 rounded-md text-xs overflow-auto max-h-40">
                <p className="font-bold">{error.name}: {error.message}</p>
                <pre className="mt-2">{error.stack}</pre>
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
