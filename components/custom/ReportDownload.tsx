"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Download } from 'lucide-react'

interface ReportDownloadProps {
  studyId: string
  reportPath: string
}

export default function ReportDownload({ studyId, reportPath }: ReportDownloadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    if (!reportPath) return
    setLoading(true)
    setError(null)

    try {
      // Appel à la route serveur qui génère une URL signée via le client admin (bypass RLS)
      const res = await fetch(`/api/studies/${studyId}/report`)
      const payload = await res.json() as { url?: string; error?: string }

      if (!res.ok || !payload.url) {
        throw new Error(payload.error || 'Impossible de générer l\'URL de téléchargement')
      }

      window.open(payload.url, '_blank', 'noopener,noreferrer')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors du téléchargement'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      <Button
        onClick={handleDownload}
        disabled={loading}
        size="sm"
        className="bg-teal text-midnight hover:bg-teal/90 font-heading shadow-sm"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Téléchargement...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Télécharger le rapport PDF
          </>
        )}
      </Button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  )
}
