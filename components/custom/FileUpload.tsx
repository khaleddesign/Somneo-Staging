'use client'

import { useState, useRef, useEffect } from 'react'
import { useFileUpload } from '@/hooks/useFileUpload'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Upload } from 'lucide-react'

interface FileUploadProps {
  onUploadComplete?: (data: {
    fileName: string
    fileSize: number
    checksum: string
    filePath: string
  }) => void
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const { state, progress, fileName, fileSize, filePath, checksum, errorMessage, uploadFile, pause, resume, cancel } = useFileUpload()
  const [isDragging, setIsDragging] = useState(false)
  const onUploadCompleteRef = useRef(onUploadComplete)
  onUploadCompleteRef.current = onUploadComplete

  useEffect(() => {
    if (state === 'completed' && fileName && fileSize && filePath && checksum) {
      onUploadCompleteRef.current?.({ fileName, fileSize, filePath, checksum })
    }
  }, [state, fileName, fileSize, filePath, checksum])
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (isValidFile(file)) {
        await uploadFile(file)
      } else {
        alert('Fichier non valide. Acceptés : .edf, .zip')
      }
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file) {
      await uploadFile(file)
    }
  }

  const isValidFile = (file: File): boolean => {
    const validExtensions = ['.edf', '.zip']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    return validExtensions.includes(fileExtension) && file.size <= 2 * 1024 * 1024 * 1024 // 2GB
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="w-full space-y-4">
      {state === 'idle' || (state === 'error' && !fileName) ? (
        <div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
        >
          <Upload className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium text-gray-900">Déposer votre fichier EDF</p>
          <p className="text-sm text-gray-500 mt-1">ou</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3"
          >
            Parcourir les fichiers
          </Button>
          <p className="text-xs text-gray-400 mt-3">EDF, ZIP jusqu'à 2 Go</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".edf,.zip"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : null}

      {state === 'uploading' || state === 'paused' || state === 'completed' ? (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-gray-900">{fileName}</p>
              <p className="text-xs text-gray-500">{fileSize ? formatFileSize(fileSize) : ''}</p>
            </div>
            <div className="text-sm font-semibold text-gray-700">{progress}%</div>
          </div>

          {/* Barre de progression */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2">
            {state === 'uploading' && (
              <Button
                variant="outline"
                size="sm"
                onClick={pause}
              >
                Pause
              </Button>
            )}
            {state === 'paused' && (
              <Button
                variant="outline"
                size="sm"
                onClick={resume}
              >
                Reprendre
              </Button>
            )}
            {state !== 'completed' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={cancel}
              >
                Annuler
              </Button>
            )}
          </div>

          {state === 'completed' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Upload terminé</span>
            </div>
          )}
        </div>
      ) : null}

      {errorMessage && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 text-sm">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}
