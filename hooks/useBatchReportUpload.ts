'use client'

/**
 * Batch PDF report upload orchestrator (agent side).
 *
 * Each item tracks one PDF file → one matched study.
 * Uploads run sequentially. Reuses existing:
 *   POST /api/studies/{id}/report  — upload PDF
 *   PATCH /api/studies/{id}/status — set 'termine'
 */

import { useState, useCallback } from 'react'
import { extractPatientRef } from '@/lib/utils/patientRefExtractor'

export interface StudyMatch {
  id: string
  patient_reference: string
  study_type: string
  status: string
  submitted_at: string
  has_report: boolean
}

export type MatchStatus = 'matched' | 'unmatched' | 'ambiguous'
export type ItemUploadState = 'idle' | 'uploading' | 'completed' | 'error' | 'skipped'

export interface ReportBatchItem {
  id: string                    // local UUID
  file: File
  extractedRef: string | null   // regex-extracted patient ref
  matchStatus: MatchStatus
  matchedStudy: StudyMatch | null
  candidateStudies: StudyMatch[] // for ambiguous / manual combobox
  overwriteConfirmed: boolean    // true if existing report acknowledged
  uploadState: ItemUploadState
  progress: number
  errorMessage: string | null
}

export type BatchReportPhase = 'idle' | 'uploading' | 'done'

export interface UseBatchReportUploadResult {
  items: ReportBatchItem[]
  phase: BatchReportPhase
  addFiles: (files: File[]) => Promise<void>
  assignStudy: (itemId: string, study: StudyMatch) => void
  setOverwriteConfirmed: (itemId: string, confirmed: boolean) => void
  removeItem: (itemId: string) => void
  startBatch: () => Promise<void>
  retryErrors: () => Promise<void>
  canStart: boolean
  successCount: number
  errorCount: number
}

function newItem(file: File): ReportBatchItem {
  return {
    id: crypto.randomUUID(),
    file,
    extractedRef: null,
    matchStatus: 'unmatched',
    matchedStudy: null,
    candidateStudies: [],
    overwriteConfirmed: false,
    uploadState: 'idle',
    progress: 0,
    errorMessage: null,
  }
}

async function autoMatch(ref: string): Promise<StudyMatch[]> {
  if (!ref) return []
  const res = await fetch(
    `/api/studies/search?patient_ref=${encodeURIComponent(ref)}&status=en_attente,en_cours&limit=5`
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.studies ?? []
}

export function useBatchReportUpload(): UseBatchReportUploadResult {
  const [items, setItems] = useState<ReportBatchItem[]>([])
  const [phase, setPhase] = useState<BatchReportPhase>('idle')

  const patchItem = useCallback((id: string, patch: Partial<ReportBatchItem>) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)))
  }, [])

  const addFiles = useCallback(async (files: File[]) => {
    const newItems = files
      .filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
      .map(newItem)

    // Add immediately with unmatched state
    setItems(prev => [...prev, ...newItems])

    // Auto-match in background for each item
    for (const item of newItems) {
      const ref = extractPatientRef(item.file.name)
      if (!ref) {
        setItems(prev => prev.map(it =>
          it.id === item.id ? { ...it, extractedRef: null, matchStatus: 'unmatched' } : it
        ))
        continue
      }

      const candidates = await autoMatch(ref)

      let matchStatus: MatchStatus
      let matchedStudy: StudyMatch | null = null

      if (candidates.length === 0) {
        matchStatus = 'unmatched'
      } else if (candidates.length === 1) {
        matchStatus = 'matched'
        matchedStudy = candidates[0]
      } else {
        matchStatus = 'ambiguous'
      }

      setItems(prev => prev.map(it =>
        it.id === item.id
          ? { ...it, extractedRef: ref, matchStatus, matchedStudy, candidateStudies: candidates }
          : it
      ))
    }
  }, [])

  const assignStudy = useCallback((itemId: string, study: StudyMatch) => {
    setItems(prev => prev.map(it =>
      it.id === itemId
        ? { ...it, matchedStudy: study, matchStatus: 'matched', candidateStudies: [] }
        : it
    ))
  }, [])

  const setOverwriteConfirmed = useCallback((itemId: string, confirmed: boolean) => {
    patchItem(itemId, { overwriteConfirmed: confirmed })
  }, [patchItem])

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(it => it.id !== itemId))
  }, [])

  const uploadOne = useCallback(async (item: ReportBatchItem) => {
    if (!item.matchedStudy) {
      patchItem(item.id, { uploadState: 'skipped' })
      return
    }

    // Block if study has existing report and overwrite not confirmed
    if (item.matchedStudy.has_report && !item.overwriteConfirmed) {
      patchItem(item.id, {
        uploadState: 'error',
        errorMessage: 'Ce rapport écrase un rapport existant. Confirmez avant de continuer.',
      })
      return
    }

    patchItem(item.id, { uploadState: 'uploading', progress: 0, errorMessage: null })

    try {
      const studyId = item.matchedStudy.id

      // 1. Upload PDF via existing route
      const formData = new FormData()
      formData.append('file', item.file)

      patchItem(item.id, { progress: 30 })
      const uploadRes = await fetch(`/api/studies/${studyId}/report`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Erreur upload PDF')
      }

      patchItem(item.id, { progress: 70 })

      // 2. Update status to 'termine'
      await fetch(`/api/studies/${studyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'termine' }),
      })

      // 3. Notify client (fire-and-forget)
      fetch(`/api/studies/${studyId}/report-notify`, { method: 'POST' }).catch(() => {})

      patchItem(item.id, { uploadState: 'completed', progress: 100 })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      patchItem(item.id, { uploadState: 'error', errorMessage: message })
    }
  }, [patchItem])

  const runBatch = useCallback(async (targets: ReportBatchItem[]) => {
    setPhase('uploading')
    for (const item of targets) {
      await uploadOne(item)
    }
    setPhase('done')
  }, [uploadOne])

  const startBatch = useCallback(async () => {
    const targets = items.filter(it => it.uploadState === 'idle')
    await runBatch(targets)
  }, [items, runBatch])

  const retryErrors = useCallback(async () => {
    const targets = items.filter(it => it.uploadState === 'error')
    targets.forEach(it => patchItem(it.id, { uploadState: 'idle', errorMessage: null, progress: 0 }))
    await runBatch(targets)
  }, [items, runBatch, patchItem])

  const readyItems = items.filter(it => it.matchedStudy !== null && it.uploadState === 'idle')
  const needsOverwriteConfirm = items.some(
    it => it.matchedStudy?.has_report && !it.overwriteConfirmed && it.uploadState === 'idle'
  )
  const canStart = readyItems.length > 0 && phase === 'idle' && !needsOverwriteConfirm

  const successCount = items.filter(it => it.uploadState === 'completed').length
  const errorCount = items.filter(it => it.uploadState === 'error').length

  return {
    items,
    phase,
    addFiles,
    assignStudy,
    setOverwriteConfirmed,
    removeItem,
    startBatch,
    retryErrors,
    canStart,
    successCount,
    errorCount,
  }
}
