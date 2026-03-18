'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ReportMatchRow } from '@/components/custom/ReportMatchRow'
import { useBatchReportUpload } from '@/hooks/useBatchReportUpload'
import { Upload, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export function BatchReportUpload() {
  const {
    items,
    phase,
    addFiles,
    assignStudy,
    setOverwriteConfirmed,
    removeItem,
    startBatch,
    retryErrors,
    canStart,
    successCount,
    errorCount,
  } = useBatchReportUpload()

  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isDone = phase === 'done'
  const isUploading = phase === 'uploading'
  const hasErrors = errorCount > 0

  const unmatchedCount = items.filter(
    it => it.uploadState === 'idle' && !it.matchedStudy
  ).length
  const overwritePending = items.filter(
    it => it.matchedStudy?.has_report && !it.overwriteConfirmed && it.uploadState === 'idle'
  ).length

  async function handleFiles(files: FileList | File[]) {
    setValidationError(null)
    const arr = Array.from(files)
    const invalid = arr.filter(f => !isPdf(f))

    if (invalid.length > 0) {
      setValidationError(`${invalid.length} fichier(s) ignoré(s) : seuls les PDF sont acceptés.`)
    }

    const valid = arr.filter(isPdf)
    if (valid.length > 0) await addFiles(valid)
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

  const globalProgress = items.length === 0 ? 0
    : Math.round((items.filter(it => it.uploadState === 'completed' || it.uploadState === 'skipped').length / items.length) * 100)

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      {phase === 'idle' && (
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
            Glissez vos rapports PDF ici
          </p>
          <p className="text-sm text-gray-500 mt-1">
            ou cliquez pour parcourir
          </p>
          <p className="text-xs text-gray-400 mt-2">
            PDF uniquement · Association automatique par référence patient
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf"
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
      {isUploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{successCount} / {items.filter(it => it.matchedStudy).length} rapports uploadés</span>
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

      {/* Hints */}
      {phase === 'idle' && items.length > 0 && (unmatchedCount > 0 || overwritePending > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 space-y-1">
          {unmatchedCount > 0 && (
            <p><AlertCircle className="inline h-3.5 w-3.5 mr-1" />
              {unmatchedCount} fichier{unmatchedCount > 1 ? 's' : ''} sans correspondance — assignez manuellement.
            </p>
          )}
          {overwritePending > 0 && (
            <p><AlertCircle className="inline h-3.5 w-3.5 mr-1" />
              {overwritePending} étude{overwritePending > 1 ? 's' : ''} avec rapport existant — confirmez l&apos;écrasement.
            </p>
          )}
        </div>
      )}

      {/* File list */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => (
            <ReportMatchRow
              key={item.id}
              item={item}
              index={index}
              onAssign={assignStudy}
              onOverwriteConfirm={setOverwriteConfirmed}
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
              {successCount} rapport{successCount > 1 ? 's' : ''} uploadé{successCount > 1 ? 's' : ''}
              {hasErrors && `, ${errorCount} erreur${errorCount > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {phase === 'idle' && items.length > 0 && (
          <Button
            onClick={startBatch}
            disabled={!canStart}
            className="bg-teal text-white hover:bg-teal/90"
          >
            <Upload className="h-4 w-4 mr-2" />
            Confirmer et uploader ({items.filter(it => it.matchedStudy && it.uploadState === 'idle').length} rapport{items.filter(it => it.matchedStudy && it.uploadState === 'idle').length > 1 ? 's' : ''})
          </Button>
        )}

        {isDone && hasErrors && (
          <Button
            variant="outline"
            onClick={retryErrors}
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer les erreurs ({errorCount})
          </Button>
        )}
      </div>
    </div>
  )
}
