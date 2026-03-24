'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, Loader2, X, AlertCircle } from 'lucide-react'
import type { BatchFileItem, StudyType, Priority } from '@/hooks/useBatchEDFUpload'
import { formatFileSize } from '@/lib/utils'

interface BatchEDFFileRowProps {
  item: BatchFileItem
  index: number
  onUpdate: (id: string, patch: Partial<Pick<BatchFileItem, 'patientRef' | 'studyType' | 'priority' | 'notes'>>) => void
  onRemove: (id: string) => void
  disabled: boolean
}

export function BatchEDFFileRow({ item, index, onUpdate, onRemove, disabled }: BatchEDFFileRowProps) {
  const isUploading = item.uploadState === 'uploading'
  const isCompleted = item.uploadState === 'completed'
  const isError = item.uploadState === 'error'
  const isActive = isUploading || isCompleted || isError
  const fieldDisabled = disabled || isCompleted || isUploading

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-colors ${
      isCompleted ? 'border-green-200 bg-green-50' :
      isError ? 'border-red-200 bg-red-50' :
      item.isDuplicate ? 'border-amber-200 bg-amber-50' :
      'border-gray-200 bg-white'
    }`}>
      {/* Row header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-heading text-gray-400 shrink-0">#{index + 1}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
            <p className="text-xs text-gray-400">{formatFileSize(item.file.size)}</p>
          </div>
          {item.isDuplicate && (
            <span className="inline-flex items-center gap-1 text-xs font-heading text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
              <AlertTriangle className="h-3 w-3" />
              Possible doublon
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-600" />}
          {isError && <AlertCircle className="h-5 w-5 text-red-600" />}
          {!isCompleted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-red-500"
              onClick={() => onRemove(item.id)}
              disabled={isUploading}
              aria-label="Supprimer ce fichier"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar (visible during/after upload) */}
      {isActive && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {isUploading
                ? item.progress < 10
                  ? 'Calcul du checksum...'
                  : 'Upload en cours...'
                : isCompleted
                ? 'Terminé'
                : item.errorMessage ?? 'Erreur'}
            </span>
            {isUploading && <span>{item.progress}%</span>}
          </div>
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

      {/* Form fields (hidden when completed) */}
      {!isCompleted && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Patient reference */}
          <div className="space-y-1">
            <Label className="text-xs font-heading text-gray-600">
              Référence patient <span className="text-red-500">*</span>
            </Label>
            <Input
              value={item.patientRef}
              onChange={e => onUpdate(item.id, { patientRef: e.target.value })}
              placeholder="ex: PAT-2026-001"
              disabled={fieldDisabled}
              className={`text-sm ${!item.patientRef.trim() && disabled ? 'border-red-300' : 'border-gray-200 focus-visible:border-teal focus-visible:ring-teal/20'}`}
            />
          </div>

          {/* Study type */}
          <div className="space-y-1">
            <Label className="text-xs font-heading text-gray-600">
              Type d&apos;étude <span className="text-red-500">*</span>
            </Label>
            <Select
              value={item.studyType}
              onValueChange={v => onUpdate(item.id, { studyType: v as StudyType })}
              disabled={fieldDisabled}
            >
              <SelectTrigger className={`text-sm ${!item.studyType && disabled ? 'border-red-300' : 'border-gray-200'}`}>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PSG">PSG — Polysomnographie</SelectItem>
                <SelectItem value="PV">PV — Polygraphie ventilatoire</SelectItem>
                <SelectItem value="MSLT">MSLT — Test de latence multiple</SelectItem>
                <SelectItem value="MWT">MWT — Test de maintien de l&apos;éveil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <Label className="text-xs font-heading text-gray-600">Priorité</Label>
            <Select
              value={item.priority}
              onValueChange={v => onUpdate(item.id, { priority: v as Priority })}
              disabled={fieldDisabled}
            >
              <SelectTrigger className="text-sm border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Basse</SelectItem>
                <SelectItem value="medium">Normale</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs font-heading text-gray-600">Notes (optionnel)</Label>
            <Textarea
              value={item.notes}
              onChange={e => onUpdate(item.id, { notes: e.target.value })}
              placeholder="Informations complémentaires..."
              disabled={fieldDisabled}
              rows={1}
              className="text-sm border-gray-200 focus-visible:border-teal focus-visible:ring-teal/20 resize-none"
            />
          </div>
        </div>
      )}

      {/* Completed summary */}
      {isCompleted && (
        <p className="text-xs text-green-700">
          {item.patientRef} · {item.studyType} · {item.priority}
          {item.notes ? ` · ${item.notes}` : ''}
        </p>
      )}
    </div>
  )
}
