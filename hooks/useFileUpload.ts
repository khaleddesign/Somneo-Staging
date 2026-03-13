'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import SparkMD5 from 'spark-md5'
import * as tus from 'tus-js-client'
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

  // Cleanup pending upload on unmount
  useEffect(() => {
    return () => {
      if (uploadRef.current && state === 'uploading') {
        uploadRef.current.abort()
      }
    }
  }, [state])

  const uploadFile = useCallback(
    async (file: File) => {
      try {
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

        setProgress(5)
        const md5 = await calculateMD5(file)
        setChecksum(md5)

        const fileExt = file.name.split('.').pop()?.toLowerCase()
        const storedFileName = `${session.user.id}-${Date.now()}.${fileExt}`
        const objectPath = `${session.user.id}/${storedFileName}`
        setFilePath(objectPath)

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl) {
          throw new Error('Variables Supabase manquantes')
        }

        const upload = new tus.Upload(file, {
          endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'true',
          },
          uploadDataDuringCreation: true,
          metadata: {
            bucketName: BUCKET_NAME,
            objectName: objectPath,
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600',
          },
          chunkSize: 6 * 1024 * 1024, // Supabase recommends 6MB
          onError: (error) => {
            console.error('[TUS Upload Error]:', error)
            setErrorMessage('Erreur réseau lors de l\'upload : ' + (error.message || 'Interruption inattendue'))
            setState('error')
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const pct = Math.round((bytesUploaded / bytesTotal) * 100)
            setProgress(Math.max(10, pct)) // Start showing progress after initial checksum buffer
          },
          onSuccess: () => {
            setState('completed')
            setProgress(100)
          },
        })

        uploadRef.current = upload

        // Check if there are any previous uploads to continue.
        const previousUploads = await upload.findPreviousUploads()
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0])
        }

        upload.start()
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
    if (uploadRef.current) {
      uploadRef.current.start()
      setState('uploading')
    }
  }, [])

  const cancel = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.abort()
      uploadRef.current = null
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
