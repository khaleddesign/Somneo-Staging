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
      // Call to server route that generates a signed URL via admin client (bypass RLS)
      const res = await fetch(`/api/studies/${studyId}/report`)
      const payload = await res.json() as { url?: string; error?: string }

      if (!res.ok || !payload.url) {
        throw new Error(payload.error || 'Unable to generate download URL')
      }

      window.open(payload.url, '_blank', 'noopener,noreferrer')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Download error'
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
            Downloading...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download PDF report
          </>
        )}
      </Button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  )
}
