'use client'

import { useState, useRef, useCallback } from 'react'
import SparkMD5 from 'spark-md5'
import { createClient } from '@/lib/supabase/client'

export type UploadState = 'idle' | 'uploading' | 'paused' | 'completed' | 'error'

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

const BUCKET_NAME = 'study-files'

export function useFileUpload(): UseFileUploadResult {
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [checksum, setChecksum] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const abortedRef = useRef(false)
  const supabaseRef = useRef(createClient())

  const calculateMD5 = useCallback(async (file: File): Promise<string> => {
    const chunkSize = 2097152 // 2MB
    const chunks = Math.ceil(file.size / chunkSize)
    const spark = new SparkMD5.ArrayBuffer()

    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)
      const arrayBuffer = await chunk.arrayBuffer()
      spark.append(arrayBuffer)
    }

    return spark.end()
  }, [])

  const uploadFile = useCallback(
    async (file: File) => {
      try {
        abortedRef.current = false
        setState('uploading')
        setProgress(0)
        setErrorMessage(null)
        setFileName(file.name)
        setFileSize(file.size)

        const supabase = supabaseRef.current
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setErrorMessage('Session expirée. Veuillez vous reconnecter.')
          setState('error')
          return
        }

        // Calculer MD5
        setProgress(10)
        const md5 = await calculateMD5(file)
        setChecksum(md5)

        if (abortedRef.current) return

        // Préparer le chemin de stockage
        const fileExt = file.name.split('.').pop()?.toLowerCase()
        const storedFileName = `${session.user.id}-${Date.now()}.${fileExt}`
        const objectPath = `${session.user.id}/${storedFileName}`
        setFilePath(objectPath)
        setProgress(20)

        // Upload direct via Supabase Storage JS client
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(objectPath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type || 'application/octet-stream',
          })

        if (abortedRef.current) return

        if (uploadError) {
          setErrorMessage(uploadError.message || "Erreur lors de l'upload")
          setState('error')
          return
        }

        setState('completed')
        setProgress(100)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        setErrorMessage(message)
        setState('error')
      }
    },
    [calculateMD5]
  )

  const pause = useCallback(() => {
    // Non supporté en upload direct
  }, [])

  const resume = useCallback(() => {
    // Non supporté en upload direct
  }, [])

  const cancel = useCallback(() => {
    abortedRef.current = true
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
