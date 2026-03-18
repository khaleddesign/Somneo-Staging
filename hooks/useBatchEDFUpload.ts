'use client'

/**
 * Batch EDF upload orchestrator.
 *
 * Manages an array of BatchFileItem — each tracks its own upload state,
 * progress, and form metadata. Uploads run sequentially (one at a time)
 * to avoid network/server saturation with large EDF files.
 *
 * Calls startTusUpload (pure function) directly — no hook instantiation
 * in a loop, which would violate the Rules of Hooks.
 */

import { useState, useCallback } from 'react'
import { startTusUpload, type UploadState } from '@/lib/utils/tusUpload'

export type StudyType = 'PSG' | 'PV' | 'MSLT' | 'MWT'
export type Priority = 'low' | 'medium' | 'high'

export interface BatchFileItem {
  id: string              // local UUID (not DB id)
  file: File
  patientRef: string
  studyType: StudyType | ''
  priority: Priority
  notes: string
  // upload runtime
  uploadState: UploadState
  progress: number
  filePath: string | null
  checksum: string | null
  errorMessage: string | null
  // post-upload
  studyId: string | null  // DB id once created
  isDuplicate: boolean    // same filename+size already in the batch
}

export type BatchPhase = 'idle' | 'uploading' | 'done'

export interface UseBatchEDFUploadResult {
  items: BatchFileItem[]
  phase: BatchPhase
  globalProgress: number      // 0-100 across all items
  addFiles: (files: File[]) => void
  removeItem: (id: string) => void
  updateItem: (id: string, patch: Partial<Pick<BatchFileItem, 'patientRef' | 'studyType' | 'priority' | 'notes'>>) => void
  startBatch: () => Promise<void>
  retryErrors: () => Promise<void>
  canStart: boolean
}

const MAX_FILES = 20
const MAX_FILE_SIZE = 500 * 1024 * 1024       // 500 MB per file
const MAX_TOTAL_SIZE = 5 * 1024 * 1024 * 1024  // 5 GB total batch

function newItem(file: File, isDuplicate: boolean): BatchFileItem {
  return {
    id: crypto.randomUUID(),
    file,
    patientRef: '',
    studyType: '',
    priority: 'medium',
    notes: '',
    uploadState: 'idle',
    progress: 0,
    filePath: null,
    checksum: null,
    errorMessage: null,
    studyId: null,
    isDuplicate,
  }
}

export function useBatchEDFUpload(): UseBatchEDFUploadResult {
  const [items, setItems] = useState<BatchFileItem[]>([])
  const [phase, setPhase] = useState<BatchPhase>('idle')

  const patchItem = useCallback((id: string, patch: Partial<BatchFileItem>) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)))
  }, [])

  // --- public API ---

  const addFiles = useCallback((files: File[]) => {
    setItems(prev => {
      const remaining = MAX_FILES - prev.length
      if (remaining <= 0) return prev

      const totalExisting = prev.reduce((acc, it) => acc + it.file.size, 0)
      const accepted: BatchFileItem[] = []
      let runningTotal = totalExisting

      for (const file of files.slice(0, remaining)) {
        if (file.size > MAX_FILE_SIZE) continue
        if (runningTotal + file.size > MAX_TOTAL_SIZE) break

        const isDuplicate = prev.some(
          it => it.file.name === file.name && it.file.size === file.size
        )

        runningTotal += file.size
        accepted.push(newItem(file, isDuplicate))
      }

      return [...prev, ...accepted]
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(it => it.id !== id))
  }, [])

  const updateItem = useCallback(
    (id: string, patch: Partial<Pick<BatchFileItem, 'patientRef' | 'studyType' | 'priority' | 'notes'>>) => {
      patchItem(id, patch)
    },
    [patchItem]
  )

  // Upload a single item. Returns true on success, false on error.
  const uploadOne = useCallback(async (item: BatchFileItem): Promise<boolean> => {
    patchItem(item.id, { uploadState: 'uploading', progress: 0, errorMessage: null })

    let resolvedPath: string | null = null
    let resolvedChecksum: string | null = null

    try {
      // Wrap startTusUpload (async startup + callback-based completion) in a Promise.
      // We attach .catch(reject) so that async startup errors (token fetch failure,
      // invalid extension, etc.) are properly propagated.
      await new Promise<void>((resolve, reject) => {
        startTusUpload(item.file, {
          onProgress: (p) => patchItem(item.id, { progress: p }),
          onStateChange: (s) => {
            patchItem(item.id, { uploadState: s })
            if (s === 'completed') resolve()
            if (s === 'error') reject(new Error('TUS upload failed'))
          },
          onChecksumReady: (c) => { resolvedChecksum = c },
          onPathReady: (p) => { resolvedPath = p },
          onError: (msg) => {
            patchItem(item.id, { errorMessage: msg })
            reject(new Error(msg))
          },
        }).catch(reject) // ← catches async startup errors (token fetch, etc.)
      })

      if (!resolvedPath || !resolvedChecksum) {
        throw new Error('Upload incomplet — chemin ou checksum manquant')
      }

      // Create the study record in DB
      const res = await fetch('/api/studies/batch-edf-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_reference: item.patientRef,
          study_type: item.studyType,
          priority: item.priority,
          notes: item.notes || null,
          file_path: resolvedPath,
          file_size_orig: item.file.size,
          checksum: resolvedChecksum,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erreur création de l'étude")
      }

      const { id: studyId } = await res.json()
      patchItem(item.id, {
        studyId,
        filePath: resolvedPath,
        checksum: resolvedChecksum,
        uploadState: 'completed',
      })
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      patchItem(item.id, { uploadState: 'error', errorMessage: message })
      return false
    }
  }, [patchItem])

  const runBatch = useCallback(async (targets: BatchFileItem[]) => {
    setPhase('uploading')

    // Track successes locally — avoids stale closure on `items` state
    let successCount = 0
    for (const item of targets) {
      const ok = await uploadOne(item)
      if (ok) successCount++
    }

    setPhase('done')

    // Single notification to agents after the full batch
    if (successCount > 0) {
      fetch('/api/studies/batch-edf-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success_count: successCount,
          total_count: targets.length,
        }),
      }).catch(() => {}) // fire-and-forget
    }
  }, [uploadOne])

  const startBatch = useCallback(async () => {
    const targets = items.filter(it => it.uploadState === 'idle')
    await runBatch(targets)
  }, [items, runBatch])

  const retryErrors = useCallback(async () => {
    // Snapshot items with errors, reset them to idle, then run
    setItems(prev => prev.map(it =>
      it.uploadState === 'error'
        ? { ...it, uploadState: 'idle', errorMessage: null, progress: 0 }
        : it
    ))
    // Read fresh state via functional update to get the reset items
    const targets = items.filter(it => it.uploadState === 'error')
    await runBatch(targets.map(it => ({ ...it, uploadState: 'idle' as UploadState })))
  }, [items, runBatch])

  const canStart =
    items.length > 0 &&
    phase === 'idle' &&
    items.every(it => it.patientRef.trim() !== '' && it.studyType !== '')

  const completedCount = items.filter(it => it.uploadState === 'completed').length
  const globalProgress = items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100)

  return {
    items,
    phase,
    globalProgress,
    addFiles,
    removeItem,
    updateItem,
    startBatch,
    retryErrors,
    canStart,
  }
}
