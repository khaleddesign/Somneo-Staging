"use client"

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as tus from 'tus-js-client'

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

interface UseUpload {
  progress: number
  status: UploadStatus
  errorMessage: string | null
  startUpload: (file: File, studyId: string) => void
  cancel: () => void
}

const TUS_ENDPOINT = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function useUpload(): UseUpload {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const uploadRef = useRef<Upload | null>(null)

  async function computeMD5(file: File): Promise<string> {
    // Web Crypto API ne supporte pas MD5, donc on utilise une lib JS
    // (tus-js-client ne fournit pas de checksum, donc on peut utiliser spark-md5)
    // Pour respecter le .cursorrules, on peut utiliser une implémentation pure JS
    const { default: SparkMD5 } = await import('spark-md5')
    return new Promise((resolve, reject) => {
      const chunkSize = 2097152 // 2MB
      const chunks = Math.ceil(file.size / chunkSize)
      let currentChunk = 0
      const spark = new SparkMD5.ArrayBuffer()
      const fileReader = new FileReader()

      fileReader.onload = function (e) {
        spark.append(e.target?.result as ArrayBuffer)
        currentChunk++
        if (currentChunk < chunks) {
          loadNext()
        } else {
          resolve(spark.end())
        }
      }
      fileReader.onerror = function () {
        reject('Erreur lors du calcul du checksum')
      }
      function loadNext() {
        const start = currentChunk * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        fileReader.readAsArrayBuffer(file.slice(start, end))
      }
      loadNext()
    })
  }

  async function startUpload(file: File, studyId: string) {
        const supabase = createClient()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          setErrorMessage('Session expirée. Veuillez vous reconnecter.')
          setStatus('error')
          return
        }
    setStatus('uploading')
    setProgress(0)
    setErrorMessage(null)

    let checksum = ''
    try {
      checksum = await computeMD5(file)
    } catch (err) {
      setStatus('error')
      setErrorMessage('Erreur lors du calcul du checksum')
      return
    }

    // Stocker l'état dans localStorage pour reprise
    localStorage.setItem('upload_' + studyId, JSON.stringify({ fileName: file.name, checksum }))

    const fileType = file.type || 'application/octet-stream'
    const fileName = file.name
    const objectPath = `${studyId}/${fileName}`

    const upload = new tus.Upload(file, {
      endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: 'study-files',
        objectName: objectPath,
        contentType: fileType,
        cacheControl: '3600',
      },
      chunkSize: 5 * 1024 * 1024,
      onProgress: (bytesUploaded, bytesTotal) => {
        const percent = Math.round((bytesUploaded / bytesTotal) * 100)
        setProgress(percent)
      },
      onSuccess: async () => {
        const filePath = `study-files/${objectPath}`
        await fetch(`/api/studies/${studyId}/file`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_path: filePath,
            checksum,
            file_size_orig: file.size,
          }),
        })
        setStatus('done')
      },
      onError: (error) => {
        console.error('Upload error:', error)
        setErrorMessage(error.message)
        setStatus('error')
      },
    })

    upload.start()
  }

  function cancel() {
    if (uploadRef.current) {
      uploadRef.current.abort()
      setStatus('idle')
      setProgress(0)
      setErrorMessage('Upload annulé')
    }
  }

  return {
    progress,
    status,
    errorMessage,
    startUpload,
    cancel,
  }
}

export default useUpload
