/**
 * Pure TUS upload function — not a React hook.
 * Extracted from useFileUpload so that batch orchestrators can call it
 * N times without violating the Rules of Hooks (hooks must be called a
 * constant number of times per render).
 *
 * The hook useFileUpload is kept as a thin wrapper around this function.
 */

import SparkMD5 from 'spark-md5'
import * as tus from 'tus-js-client'
import { retryWithBackoff } from '@/lib/utils/retry'

export type UploadState = 'idle' | 'uploading' | 'paused' | 'completed' | 'error'

export interface TusUploadCallbacks {
  onProgress: (progress: number) => void
  onStateChange: (state: UploadState) => void
  onChecksumReady: (checksum: string) => void
  onPathReady: (path: string) => void
  onError: (message: string) => void
}

export interface TusUploadResult {
  /** Call to abort the in-flight upload */
  abort: () => void
}

const BUCKET_NAME = 'study-files'
const ALLOWED_EXTENSIONS = ['edf', 'edf+', 'bdf', 'zip']

async function calculateMD5(file: File): Promise<string> {
  const chunkSize = 2097152 // 2 MB
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
}

/**
 * Starts a TUS upload for a single file.
 * Returns an object with an `abort()` method so the caller can cancel.
 *
 * Progress is reported via callbacks — no React state involved here.
 */
export async function startTusUpload(
  file: File,
  callbacks: TusUploadCallbacks
): Promise<TusUploadResult> {
  const { onProgress, onStateChange, onChecksumReady, onPathReady, onError } = callbacks

  const fileExt = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
    onError('Extension de fichier non autorisée')
    onStateChange('error')
    return { abort: () => {} }
  }

  onStateChange('uploading')
  onProgress(0)

  // MD5 checksum (5 % progress)
  const md5 = await calculateMD5(file)
  onChecksumReady(md5)
  onProgress(5)

  // Get a scoped upload token
  const { token, path: objectPath } = await retryWithBackoff(
    async () => {
      const res = await fetch('/api/upload/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_ext: fileExt }),
      })
      if (!res.ok) {
        // Parse JSON body safely — non-JSON responses (e.g. Vercel protection HTML
        // or gateway error pages) must still carry the HTTP status so that
        // retryWithBackoff can detect 4xx as a non-retryable client error.
        let errMsg = "Impossible d'obtenir le token d'upload"
        try {
          const err = await res.json()
          errMsg = err.error || errMsg
        } catch {
          // Body is not JSON — keep default message, attach status below
        }
        throw Object.assign(new Error(errMsg), { status: res.status })
      }
      return res.json()
    },
    { maxAttempts: 3, baseDelayMs: 1000 }
  )

  onPathReady(objectPath)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) throw new Error('Missing Supabase configuration')

  let tusInstance: tus.Upload | null = null

  const upload = new tus.Upload(file, {
    endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    headers: {
      authorization: `Bearer ${token}`,
      'x-upsert': 'true',
    },
    uploadDataDuringCreation: true,
    metadata: {
      bucketName: BUCKET_NAME,
      objectName: objectPath,
      // Normalize ZIP MIME types: Windows reports 'application/x-zip-compressed'
      // or 'application/octet-stream', macOS reports 'application/zip'.
      // Supabase storage only accepts 'application/zip', so we force it for ZIP files.
      contentType: fileExt === 'zip' ? 'application/zip' : (file.type || 'application/octet-stream'),
      cacheControl: '3600',
    },
    chunkSize: 6 * 1024 * 1024,
    onError: (error) => {
      console.error('[TUS Upload Error]:', error)
      onError("Erreur réseau lors de l'upload : " + (error.message || 'Unexpected interruption'))
      onStateChange('error')
    },
    onProgress: (bytesUploaded, bytesTotal) => {
      const pct = Math.round((bytesUploaded / bytesTotal) * 100)
      onProgress(Math.max(10, pct))
    },
    onSuccess: () => {
      onStateChange('completed')
      onProgress(100)
    },
  })

  tusInstance = upload

  const previousUploads = await upload.findPreviousUploads()
  if (previousUploads.length > 0) {
    upload.resumeFromPreviousUpload(previousUploads[0])
  }

  upload.start()

  return {
    abort: () => {
      tusInstance?.abort()
    },
  }
}
