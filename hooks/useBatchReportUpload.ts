'use client'

/**
 * Batch PDF report upload orchestrator (agent side).
 *
 * Each item tracks one PDF file → one matched study (or unassigned storage).
 * Uploads run sequentially. Uses:
 *   POST /api/studies/{id}/report       — upload PDF to assigned study
 *   PATCH /api/studies/{id}/status      — set 'termine'
 *   POST /api/reports/unassigned        — upload without study (new)
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
  skipAssignment: boolean        // true → upload sans étude assignée
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
  markAsSkipAssignment: (itemId: string, skip: boolean) => void
  removeItem: (itemId: string) => void
  startBatch: () => Promise<void>
  retryErrors: () => Promise<void>
  canStart: boolean
  successCount: number
  errorCount: number
  unassignedCount: number
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
    skipAssignment: false,
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

    setItems(prev => [...prev, ...newItems])

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
        ? { ...it, matchedStudy: study, matchStatus: 'matched', candidateStudies: [], skipAssignment: false }
        : it
    ))
  }, [])

  const setOverwriteConfirmed = useCallback((itemId: string, confirmed: boolean) => {
    patchItem(itemId, { overwriteConfirmed: confirmed })
  }, [patchItem])

  const markAsSkipAssignment = useCallback((itemId: string, skip: boolean) => {
    patchItem(itemId, { skipAssignment: skip })
  }, [patchItem])

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(it => it.id !== itemId))
  }, [])

  // Upload a PDF without any study assignment
  const uploadUnassigned = useCallback(async (item: ReportBatchItem) => {
    patchItem(item.id, { uploadState: 'uploading', progress: 10, errorMessage: null })

    try {
      const formData = new FormData()
      formData.append('file', item.file)

      patchItem(item.id, { progress: 40 })
      const res = await fetch('/api/reports/unassigned', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur upload PDF')
      }

      patchItem(item.id, { uploadState: 'completed', progress: 100 })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      patchItem(item.id, { uploadState: 'error', errorMessage: message })
    }
  }, [patchItem])

  const uploadOne = useCallback(async (item: ReportBatchItem) => {
    if (!item.matchedStudy) {
      if (item.skipAssignment) {
        await uploadUnassigned(item)
      } else {
        patchItem(item.id, { uploadState: 'skipped' })
      }
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

      await fetch(`/api/studies/${studyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'termine' }),
      })

      fetch(`/api/studies/${studyId}/report-notify`, { method: 'POST' }).catch(() => {})

      patchItem(item.id, { uploadState: 'completed', progress: 100 })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      patchItem(item.id, { uploadState: 'error', errorMessage: message })
    }
  }, [patchItem, uploadUnassigned])

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

  // canStart: at least one item is ready (assigned OR skipAssignment) and no unconfirmed overwrites
  const readyItems = items.filter(
    it => it.uploadState === 'idle' && (it.matchedStudy !== null || it.skipAssignment)
  )
  const needsOverwriteConfirm = items.some(
    it => it.matchedStudy?.has_report && !it.overwriteConfirmed && it.uploadState === 'idle'
  )
  const canStart = readyItems.length > 0 && phase === 'idle' && !needsOverwriteConfirm

  const successCount = items.filter(it => it.uploadState === 'completed').length
  const errorCount = items.filter(it => it.uploadState === 'error').length
  const unassignedCount = items.filter(
    it => it.skipAssignment && it.uploadState === 'idle'
  ).length

  return {
    items,
    phase,
    addFiles,
    assignStudy,
    setOverwriteConfirmed,
    markAsSkipAssignment,
    removeItem,
    startBatch,
    retryErrors,
    canStart,
    successCount,
    errorCount,
    unassignedCount,
  }
}
