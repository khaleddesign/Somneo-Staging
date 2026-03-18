'use client'

/**
 * Thin hook wrapper around startTusUpload (lib/utils/tusUpload.ts).
 *
 * For single-file uploads — used by FileUpload.tsx and StudySubmissionForm.
 * For batch uploads, use useBatchEDFUpload which calls startTusUpload directly
 * without violating the Rules of Hooks.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { startTusUpload, type UploadState } from '@/lib/utils/tusUpload'

export type { UploadState }

export interface UseFileUploadResult {
  state: UploadState
  progress: number
  fileName: string | null
  fileSize: number | null
  filePath: string | null
  checksum: string | null
  errorMessage: string | null
  uploadFile: (file: File) => Promise<void>
  pause: () => void
  resume: () => void
  cancel: () => void
}

export function useFileUpload(): UseFileUploadResult {
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [checksum, setChecksum] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const abortRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      if (state === 'uploading') abortRef.current?.()
    }
  }, [state])

  const uploadFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setFileSize(file.size)
    setErrorMessage(null)
    setFilePath(null)
    setChecksum(null)

    try {
      const { abort } = await startTusUpload(file, {
        onProgress: setProgress,
        onStateChange: setState,
        onChecksumReady: setChecksum,
        onPathReady: setFilePath,
        onError: setErrorMessage,
      })
      abortRef.current = abort
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setErrorMessage(message)
      setState('error')
    }
  }, [])

  const pause = useCallback(() => {
    abortRef.current?.()
    setState('paused')
  }, [])

  const resume = useCallback(() => {
    // TUS resume is handled internally via findPreviousUploads on next uploadFile call
    setState('uploading')
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.()
    abortRef.current = null
    setState('idle')
    setProgress(0)
    setFileName(null)
    setFileSize(null)
    setFilePath(null)
    setChecksum(null)
    setErrorMessage(null)
  }, [])

  return {
    state,
    progress,
    fileName,
    fileSize,
    filePath,
    checksum,
    errorMessage,
    uploadFile,
    pause,
    resume,
    cancel,
  }
}
