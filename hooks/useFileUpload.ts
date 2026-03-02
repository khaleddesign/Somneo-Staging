'use client'

import { useState, useRef, useCallback } from 'react'
import * as tus from 'tus-js-client'
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

const TUS_ENDPOINT = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`
const BUCKET_NAME = 'studies-files'

export function useFileUpload(): UseFileUploadResult {
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [checksum, setChecksum] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const uploadRef = useRef<tus.Upload | null>(null)
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
        setState('uploading')
        setProgress(0)
        setErrorMessage(null)
        setFileName(file.name)
        setFileSize(file.size)

        // Vérifier la session
        const supabase = supabaseRef.current
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setErrorMessage('Session expirée. Veuillez vous reconnecter.')
          setState('error')
          return
        }

        // Calculer MD5
        const md5 = await calculateMD5(file)
        setChecksum(md5)

        // Préparer le chemin de stockage
        const fileExt = file.name.split('.').pop()?.toLowerCase()
        const storedFileName = `${session.user.id}-${Date.now()}.${fileExt}`
        const objectPath = `${session.user.id}/${storedFileName}`
        setFilePath(objectPath)

        // Créer l'upload TUS
        const tusUpload = new tus.Upload(file, {
          endpoint: TUS_ENDPOINT,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'x-upsert': 'true',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: BUCKET_NAME,
            objectName: objectPath,
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600',
          },
          chunkSize: 5 * 1024 * 1024, // 5MB
          onProgress: (bytesUploaded: number, bytesTotal: number) => {
            const progressPercent = Math.round((bytesUploaded / bytesTotal) * 100)
            setProgress(progressPercent)
          },
          onSuccess: () => {
            setState('completed')
            setProgress(100)
          },
          onError: (error: Error) => {
            setErrorMessage(error.message || 'Erreur lors de l\'upload')
            setState('error')
          },
        })

        uploadRef.current = tusUpload
        tusUpload.start()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        setErrorMessage(message)
        setState('error')
      }
    },
    [calculateMD5]
  )

  const pause = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.abort()
      setState('paused')
    }
  }, [])

  const resume = useCallback(() => {
    if (uploadRef.current && state === 'paused') {
      setState('uploading')
      uploadRef.current.start()
    }
  }, [state])

  const cancel = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.abort()
    }
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
