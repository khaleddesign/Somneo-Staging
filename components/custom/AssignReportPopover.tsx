'use client'

/**
 * AssignReportPopover
 *
 * Popover à 2 onglets permettant d'associer un rapport PDF à une étude :
 *   - "Upload" : drag & drop direct → POST /api/studies/{id}/report
 *   - "En attente" : liste des unassigned_reports → PATCH /api/reports/unassigned/{id}/assign
 *
 * Props:
 *   studyId         — ID de l'étude cible
 *   studyPatientRef — Référence patient affichée dans le header
 *   onSuccess       — Callback appelé après succès (refresh du parent)
 */

import { useRef, useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Layers, Upload, CheckCircle2, AlertCircle, Loader2, Link2, ArchiveX
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UnassignedReport {
  id: string
  original_filename: string
  file_size: number
  uploaded_at: string
}

type UploadPhase = 'idle' | 'uploading' | 'done' | 'error'

interface AssignReportPopoverProps {
  studyId: string
  studyPatientRef: string
  onSuccess: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AssignReportPopover({
  studyId,
  studyPatientRef,
  onSuccess,
}: AssignReportPopoverProps) {
  const [open, setOpen] = useState(false)

  // ── Onglet Upload ──────────────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false)
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function runUpload(file: File) {
    if (!isPdf(file)) {
      setUploadError('Only PDF files are accepted')
      setUploadPhase('error')
      return
    }
    setUploadPhase('uploading')
    setUploadProgress(30)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/studies/${studyId}/report`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'PDF upload error')
      }

      setUploadProgress(70)

      await fetch(`/api/studies/${studyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'termine' }),
      })

      fetch(`/api/studies/${studyId}/report-notify`, { method: 'POST' }).catch(() => {})

      setUploadProgress(100)
      setUploadPhase('done')
      setTimeout(() => {
        setOpen(false)
        onSuccess()
      }, 800)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unknown error')
      setUploadPhase('error')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) runUpload(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) runUpload(file)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setUploadPhase('idle')
      setUploadProgress(0)
      setUploadError(null)
    }
  }

  // ── Onglet "En attente" ────────────────────────────────────────────────────
  const [pending, setPending] = useState<UnassignedReport[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPendingLoading(true)
    setLinkError(null)
    fetch('/api/reports/unassigned')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setPending(data.reports ?? []))
      .catch(() => setPending([]))
      .finally(() => setPendingLoading(false))
  }, [open])

  async function handleLink(reportId: string) {
    setLinkingId(reportId)
    setLinkError(null)
    try {
      const res = await fetch(`/api/reports/unassigned/${reportId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ study_id: studyId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Assignment error')
      }
      setPending(prev => prev.filter(r => r.id !== reportId))
      setTimeout(() => {
        setOpen(false)
        onSuccess()
      }, 400)
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLinkingId(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs border border-gray-200 text-gray-500 px-2.5 py-1 rounded-lg hover:bg-gray-50"
        >
          <Layers className="h-3 w-3" />
          Assign report
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-gray-50 rounded-t-md">
          <p className="text-sm font-semibold text-gray-900">Assign a report</p>
          <p className="text-xs text-gray-500 mt-0.5">Study: {studyPatientRef}</p>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="w-full rounded-none border-b h-9 bg-white px-2 pt-1">
            <TabsTrigger value="upload" className="flex-1 text-xs h-7">
              <Upload className="h-3 w-3 mr-1.5" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1 text-xs h-7">
              <ArchiveX className="h-3 w-3 mr-1.5" />
              Pending{pending.length > 0 ? ` (${pending.length})` : ''}
            </TabsTrigger>
          </TabsList>

          {/* ── Onglet Upload ── */}
          <TabsContent value="upload" className="p-4 space-y-3 mt-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileInput}
              className="hidden"
            />

            {(uploadPhase === 'idle' || uploadPhase === 'error') && (
              <div
                onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
                onDragOver={e => e.preventDefault()}
                onDragLeave={e => { e.preventDefault(); setIsDragging(false) }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                  isDragging ? 'border-teal bg-teal/10' : 'border-teal/30 bg-teal/5 hover:bg-teal/10'
                }`}
              >
                <Upload className="h-6 w-6 mx-auto mb-2 text-teal" />
                <p className="text-sm font-medium text-gray-800">Drop your PDF here</p>
                <p className="text-xs text-gray-400 mt-0.5">or click to browse</p>
              </div>
            )}

            {uploadPhase === 'uploading' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Loader2 className="h-4 w-4 animate-spin text-teal" />
                  Uploading…
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-teal h-1.5 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadPhase === 'done' && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Report assigned — study marked as completed
              </div>
            )}

            {uploadPhase === 'error' && uploadError && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {uploadError}
              </div>
            )}
          </TabsContent>

          {/* ── Onglet En attente ── */}
          <TabsContent value="pending" className="p-4 mt-0 space-y-3">
            {linkError && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {linkError}
              </div>
            )}

            {pendingLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            )}

            {!pendingLoading && pending.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                No reports pending assignment
              </p>
            )}

            {!pendingLoading && pending.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {pending.map(report => (
                  <div
                    key={report.id}
                    className="flex items-start justify-between gap-3 border border-gray-100 rounded-lg p-2.5 bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-800 truncate">
                        {report.original_filename}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatFileSize(report.file_size)} ·{' '}
                        {new Date(report.uploaded_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2 shrink-0 border-teal text-teal hover:bg-teal/5"
                      onClick={() => handleLink(report.id)}
                      disabled={linkingId === report.id}
                    >
                      {linkingId === report.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <><Link2 className="h-3 w-3 mr-1" />Link</>
                      }
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
