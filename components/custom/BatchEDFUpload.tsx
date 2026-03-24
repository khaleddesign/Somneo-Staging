'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { BatchEDFFileRow } from '@/components/custom/BatchEDFFileRow'
import { useBatchEDFUpload } from '@/hooks/useBatchEDFUpload'
import { Upload, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'

const VALID_EXTENSIONS = ['.edf', '.edf+', '.bdf', '.zip']
const MAX_FILES = 20
const MAX_FILE_SIZE = 500 * 1024 * 1024  // 500 MB

function isValidFile(file: File): boolean {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
  return VALID_EXTENSIONS.includes(ext) && file.size <= MAX_FILE_SIZE
}

export function BatchEDFUpload({ onComplete }: { onComplete?: () => void }) {
  const {
    items,
    phase,
    globalProgress,
    addFiles,
    removeItem,
    updateItem,
    startBatch,
    retryErrors,
    canStart,
  } = useBatchEDFUpload()

  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const successCount = items.filter(it => it.uploadState === 'completed').length
  const errorCount = items.filter(it => it.uploadState === 'error').length
  const hasErrors = errorCount > 0
  const isDone = phase === 'done'

  function handleFiles(files: FileList | File[]) {
    setValidationError(null)
    const arr = Array.from(files)

    if (items.length >= MAX_FILES) {
      setValidationError(`Maximum ${MAX_FILES} files per batch.`)
      return
    }

    const invalid = arr.filter(f => !isValidFile(f))
    if (invalid.length > 0) {
      setValidationError(
        `${invalid.length} file(s) skipped: invalid format or size > 500 MB.`
      )
    }

    const valid = arr.filter(isValidFile)
    if (valid.length > 0) addFiles(valid)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) handleFiles(e.target.files)
    e.target.value = ''
  }

  async function handleStart() {
    if (!canStart) {
      setValidationError('Please fill in the patient reference and type for each study.')
      return
    }
    setValidationError(null)
    await startBatch()
    onComplete?.()
  }

  return (
    <div className="space-y-6">
      {/* Drop zone — shown when we can still add files */}
      {phase === 'idle' && items.length < MAX_FILES && (
        <div
          onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
          onDragOver={e => e.preventDefault()}
          onDragLeave={e => { e.preventDefault(); setIsDragging(false) }}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            isDragging ? 'border-teal bg-teal/10' : 'border-teal/30 bg-teal/5 hover:bg-teal/10'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 mx-auto mb-3 text-teal" />
          <p className="text-base font-medium text-gray-900">
            Drop your EDF files here
          </p>
          <p className="text-sm text-gray-500 mt-1">or click to browse</p>
          <p className="text-xs text-gray-400 mt-2">
            .edf, .edf+, .bdf, .zip · max 500 MB par fichier · max {MAX_FILES} fichiers
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".edf,.bdf,.zip,application/zip,application/x-zip-compressed"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {validationError}
        </div>
      )}

      {/* Global progress bar */}
      {phase === 'uploading' && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{successCount} / {items.length} studies uploaded</span>
            <span>{globalProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-teal h-2 rounded-full transition-all"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* File list */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => (
            <BatchEDFFileRow
              key={item.id}
              item={item}
              index={index}
              onUpdate={updateItem}
              onRemove={removeItem}
              disabled={phase !== 'idle'}
            />
          ))}
        </div>
      )}

      {/* Summary when done */}
      {isDone && (
        <div className={`rounded-xl p-4 border ${hasErrors ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-2">
            {hasErrors
              ? <AlertCircle className="h-5 w-5 text-amber-600" />
              : <CheckCircle2 className="h-5 w-5 text-green-600" />}
            <p className="text-sm font-medium">
              {successCount} {successCount > 1 ? 'studies' : 'study'} created
              {hasErrors && `, ${errorCount} ${errorCount > 1 ? 'errors' : 'error'}`}
            </p>
          </div>
          {hasErrors && (
            <p className="text-xs text-amber-700 mt-1 ml-7">
              Failed files can be retried individually.
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {phase === 'idle' && items.length > 0 && (
          <Button
            onClick={handleStart}
            disabled={!canStart}
            className="bg-teal text-white hover:bg-teal/90"
          >
            <Upload className="h-4 w-4 mr-2" />
            Start upload ({items.length} {items.length > 1 ? 'files' : 'file'})
          </Button>
        )}

        {isDone && hasErrors && (
          <Button
            variant="outline"
            onClick={retryErrors}
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry errors ({errorCount})
          </Button>
        )}
      </div>
    </div>
  )
}
