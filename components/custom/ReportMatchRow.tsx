'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { StudySearchCombobox } from '@/components/custom/StudySearchCombobox'
import {
  CheckCircle2, AlertTriangle, AlertCircle, X, Loader2
} from 'lucide-react'
import type { ReportBatchItem, StudyMatch } from '@/hooks/useBatchReportUpload'

interface ReportMatchRowProps {
  item: ReportBatchItem
  index: number
  onAssign: (itemId: string, study: StudyMatch) => void
  onOverwriteConfirm: (itemId: string, confirmed: boolean) => void
  onRemove: (itemId: string) => void
  disabled: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export function ReportMatchRow({
  item,
  index,
  onAssign,
  onOverwriteConfirm,
  onRemove,
  disabled,
}: ReportMatchRowProps) {
  const isCompleted = item.uploadState === 'completed'
  const isError = item.uploadState === 'error'
  const isUploading = item.uploadState === 'uploading'
  const isSkipped = item.uploadState === 'skipped'
  const needsOverwrite = item.matchedStudy?.has_report && !item.overwriteConfirmed && item.uploadState === 'idle'

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-colors ${
      isCompleted ? 'border-green-200 bg-green-50' :
      isError ? 'border-red-200 bg-red-50' :
      isSkipped ? 'border-gray-100 bg-gray-50' :
      needsOverwrite ? 'border-amber-200 bg-amber-50' :
      item.matchStatus === 'unmatched' || item.matchStatus === 'ambiguous'
        ? 'border-orange-200 bg-orange-50'
        : 'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-heading text-gray-400 shrink-0">#{index + 1}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
            <p className="text-xs text-gray-400">{formatFileSize(item.file.size)}</p>
          </div>

          {/* Match badge */}
          {item.uploadState === 'idle' && (
            <>
              {item.matchStatus === 'matched' && !needsOverwrite && (
                <span className="inline-flex items-center gap-1 text-xs font-heading text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full shrink-0">
                  <CheckCircle2 className="h-3 w-3" />
                  Associé
                </span>
              )}
              {(item.matchStatus === 'unmatched') && (
                <span className="inline-flex items-center gap-1 text-xs font-heading text-orange-700 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-full shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  À assigner
                </span>
              )}
              {item.matchStatus === 'ambiguous' && (
                <span className="inline-flex items-center gap-1 text-xs font-heading text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  Ambigu
                </span>
              )}
              {needsOverwrite && (
                <span className="inline-flex items-center gap-1 text-xs font-heading text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  Rapport existant
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-600" />}
          {isError && <AlertCircle className="h-5 w-5 text-red-600" />}
          {isUploading && <Loader2 className="h-5 w-5 text-teal animate-spin" />}
          {!isCompleted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-red-500"
              onClick={() => onRemove(item.id)}
              disabled={isUploading}
              aria-label="Supprimer"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(isUploading || isCompleted || isError) && (
        <div className="space-y-1">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                isCompleted ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-teal'
              }`}
              style={{ width: `${item.progress}%` }}
            />
          </div>
          {isError && item.errorMessage && (
            <p className="text-xs text-red-600">{item.errorMessage}</p>
          )}
        </div>
      )}

      {/* Matched study info */}
      {item.matchedStudy && item.uploadState === 'idle' && (
        <div className="bg-white rounded-lg border border-gray-100 px-3 py-2 text-xs text-gray-700">
          <span className="font-medium">{item.matchedStudy.patient_reference}</span>
          <span className="text-gray-400 ml-2">
            {item.matchedStudy.study_type} · {new Date(item.matchedStudy.submitted_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      )}

      {/* Combobox for unmatched/ambiguous */}
      {(item.matchStatus === 'unmatched' || item.matchStatus === 'ambiguous') && item.uploadState === 'idle' && (
        <div className="space-y-1">
          <Label className="text-xs font-heading text-gray-600">
            {item.matchStatus === 'ambiguous'
              ? `${item.candidateStudies.length} correspondances trouvées — sélectionnez la bonne étude`
              : 'Aucune correspondance trouvée — assignez manuellement'}
          </Label>
          <StudySearchCombobox
            onSelect={study => onAssign(item.id, study)}
            initialCandidates={item.candidateStudies}
            disabled={disabled}
          />
        </div>
      )}

      {/* Overwrite confirmation */}
      {needsOverwrite && (
        <div className="flex items-start gap-2">
          <Checkbox
            id={`overwrite-${item.id}`}
            checked={item.overwriteConfirmed}
            onCheckedChange={checked => onOverwriteConfirm(item.id, !!checked)}
            disabled={disabled}
          />
          <Label
            htmlFor={`overwrite-${item.id}`}
            className="text-xs text-amber-800 cursor-pointer leading-relaxed"
          >
            Je confirme écraser le rapport existant pour l&apos;étude{' '}
            <strong>{item.matchedStudy?.patient_reference}</strong>.
          </Label>
        </div>
      )}

      {/* Completed summary */}
      {isCompleted && (
        <p className="text-xs text-green-700">
          Rapport uploadé → {item.matchedStudy?.patient_reference} · étude passée en <strong>terminé</strong>
        </p>
      )}

      {/* Skipped */}
      {isSkipped && (
        <p className="text-xs text-gray-500">Ignoré — aucune étude assignée</p>
      )}
    </div>
  )
}
