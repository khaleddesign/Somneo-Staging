"use client"

import { useMemo, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StudyFileDownloadCardProps {
  studyId: string
  filePath: string | null
  fileSizeBytes: number | null
}

interface DownloadResponse {
  url?: string
  error?: string
}

function formatFileSize(fileSizeBytes: number | null): string {
  if (!fileSizeBytes || fileSizeBytes <= 0) return 'Taille inconnue'

  const gb = fileSizeBytes / (1024 ** 3)
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`
  }

  const mb = fileSizeBytes / (1024 ** 2)
  return `${mb.toFixed(2)} MB`
}

export default function StudyFileDownloadCard({ studyId, filePath, fileSizeBytes }: StudyFileDownloadCardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileName = useMemo(() => {
    if (!filePath) return null
    const parts = filePath.split('/').filter(Boolean)
    return parts[parts.length - 1] || filePath
  }, [filePath])

  async function handleDownload() {
    if (!filePath) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/studies/${studyId}/download`)
      const payload = (await res.json()) as DownloadResponse

      if (!res.ok || !payload.url) {
        throw new Error(payload.error || 'Erreur lors de la génération de l’URL')
      }

      window.open(payload.url, '_blank', 'noopener,noreferrer')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de téléchargement'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-xl text-midnight font-heading">Fichier d&apos;étude</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {filePath ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">Nom du fichier</p>
                <p className="text-midnight font-body mt-1 break-all">{fileName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">Taille</p>
                <p className="text-midnight font-body mt-1">{formatFileSize(fileSizeBytes)}</p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void handleDownload()}
              disabled={loading}
              className="bg-teal text-white hover:bg-teal/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération du lien...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Télécharger le fichier EDF
                </>
              )}
            </Button>
          </>
        ) : (
          <p className="text-sm text-gray-600">Fichier archivé ou non disponible</p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  )
}
