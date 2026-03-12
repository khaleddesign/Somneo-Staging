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

  const xhrRef = useRef<XMLHttpRequest | null>(null)
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
        setProgress(5)
        const md5 = await calculateMD5(file)
        setChecksum(md5)

        // Préparer le chemin
        const fileExt = file.name.split('.').pop()?.toLowerCase()
        const storedFileName = `${session.user.id}-${Date.now()}.${fileExt}`
        const objectPath = `${session.user.id}/${storedFileName}`
        setFilePath(objectPath)
        setProgress(10)

        // Obtenir l'URL signée depuis le serveur (admin client, pas de RLS)
        const urlRes = await fetch('/api/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objectPath }),
        })

        const rawText = await urlRes.text()
        console.log('[upload-url] status:', urlRes.status, 'body:', rawText)

        if (!urlRes.ok) {
          let errMsg = `Erreur ${urlRes.status}`
          try { errMsg = JSON.parse(rawText)?.error || errMsg } catch {}
          setErrorMessage(errMsg)
          setState('error')
          return
        }

        let signedUrl: string
        try {
          signedUrl = JSON.parse(rawText)?.signedUrl
        } catch {
          setErrorMessage('Réponse serveur invalide: ' + rawText.slice(0, 100))
          setState('error')
          return
        }

        if (!signedUrl) {
          setErrorMessage('URL signée manquante dans la réponse')
          setState('error')
          return
        }

        // Upload direct vers Supabase via XHR (avec barre de progression)
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhrRef.current = xhr

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round(10 + (e.loaded / e.total) * 90)
              setProgress(pct)
            }
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`Upload échoué (${xhr.status}): ${xhr.responseText}`))
            }
          }

          xhr.onerror = () => reject(new Error('Erreur réseau lors de l\'upload'))
          xhr.onabort = () => reject(new Error('Upload annulé'))

          xhr.open('PUT', signedUrl)
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
          xhr.send(file)
        })

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
    // Non supporté avec XHR direct
  }, [])

  const resume = useCallback(() => {
    // Non supporté avec XHR direct
  }, [])

  const cancel = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort()
      xhrRef.current = null
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
