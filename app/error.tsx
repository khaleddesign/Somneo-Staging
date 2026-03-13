'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log l'erreur auprès d'un service de tracking
    console.error('[Route Error]', error)
  }, [error])

  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center bg-[#f0f4f8] p-4 text-center font-body">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full flex flex-col items-center">
        <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        
        <h2 className="text-2xl font-display text-midnight mb-3">Erreur de chargement</h2>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          Nous n'avons pas pu charger cette page correctement. Le problème a été signalé à notre équipe technique.
        </p>
        
        <button
          onClick={() => reset()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 py-3 font-heading text-white hover:bg-teal/90 transition-all active:scale-95 shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 mx-auto w-full rounded-md bg-red-50 p-4 text-left text-xs text-red-900 overflow-auto max-h-40 border border-red-100">
            <p className="font-bold">{error.name}: {error.message}</p>
            {error.digest && <p className="mt-1 opacity-70">Digest: {error.digest}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
