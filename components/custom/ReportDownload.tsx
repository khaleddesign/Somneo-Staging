"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Download } from 'lucide-react'

interface ReportDownloadProps {
  reportPath: string
}

export default function ReportDownload({ reportPath }: ReportDownloadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      // normalize path: remove bucket prefix if mistakenly stored
      const path = reportPath.startsWith('reports-files/')
        ? reportPath.replace(/^reports-files\//, '')
        : reportPath

      const { data, error } = await supabase.storage
        .from('reports-files')
        .createSignedUrl(path, 60)

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Impossible de générer l\'URL de téléchargement')
      }

      // déclenchement du téléchargement
      window.location.href = data.signedUrl
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors de la préparation du téléchargement'
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
