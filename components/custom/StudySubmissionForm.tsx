'use client'

import { useState, useRef } from 'react'
import { FileUpload } from '@/components/custom/FileUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

interface UploadedFileData {
  fileName: string
  fileSize: number
  checksum: string
  filePath: string
}

export function StudySubmissionForm({ onSuccess }: { onSuccess?: () => void }) {
  const [patientRef, setPatientRef] = useState('')
  const [studyType, setStudyType] = useState('')
  const [priority, setPriority] = useState('medium')
  const [notes, setNotes] = useState('')
  const [uploadedFile, setUploadedFile] = useState<UploadedFileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const patientRefError = !!error && !patientRef
  const studyTypeError = !!error && !studyType
  const fileError = !!error && !uploadedFile
  const supabaseRef = useRef(createClient())

  const handleUploadComplete = (data: UploadedFileData) => {
    setUploadedFile(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientRef || !studyType || !uploadedFile) {
      setError('Please fill in all required fields and upload a file')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = supabaseRef.current
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Session expired. Please sign in again.')
        setLoading(false)
        return
      }

      // Create the record in the studies table
      const { error: insertError } = await supabase
        .from('studies')
        .insert({
          client_id: user.id,
          patient_reference: patientRef,
          study_type: studyType,
          priority: priority,
          status: 'en_attente',
          file_path: uploadedFile.filePath,
          file_size_orig: uploadedFile.fileSize,
          checksum: uploadedFile.checksum,
          notes: notes || null,
          submitted_at: new Date().toISOString(),
        })

      if (insertError) {
        setError('Error creating study: ' + insertError.message)
        return
      }

      setSuccess(true)
      setPatientRef('')
      setStudyType('')
      setPriority('medium')
      setNotes('')
      setUploadedFile(null)

      // Refresh study list after 2 seconds
      setTimeout(() => {
        onSuccess?.()
        setSuccess(false)
      }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full border border-gray-100 rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-midnight font-heading">Submit a new study</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Reference */}
          <div className="space-y-2">
            <Label htmlFor="patient-ref" className="font-heading text-sm text-gray-700">Patient reference *</Label>
            <Input
              id="patient-ref"
              value={patientRef}
              onChange={(e) => setPatientRef(e.target.value)}
              placeholder="e.g. PAT-2026-001"
              required
              disabled={loading}
              aria-invalid={patientRefError}
              className={patientRefError ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus-visible:border-teal focus-visible:ring-teal/20'}
            />
            {patientRefError && (
              <p className="text-sm text-red-600">Required field</p>
            )}
          </div>

          {/* Study Type */}
          <div className="space-y-2">
            <Label htmlFor="study-type" className="font-heading text-sm text-gray-700">Study type *</Label>
            <Select value={studyType} onValueChange={setStudyType} disabled={loading}>
              <SelectTrigger
                id="study-type"
                className={studyTypeError ? 'border-red-500 focus:border-red-600' : 'border-gray-200 focus:border-teal'}
              >
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PSG">PSG (Polysomnographie)</SelectItem>
                <SelectItem value="PV">PV (Polygraphie)</SelectItem>
              </SelectContent>
            </Select>
            {studyTypeError && (
              <p className="text-sm text-red-600">Required field</p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="font-heading text-sm text-gray-700">Priority</Label>
            <Select value={priority} onValueChange={setPriority} disabled={loading}>
              <SelectTrigger id="priority" className="border-gray-200 focus:border-teal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="font-heading text-sm text-gray-700">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional information..."
              disabled={loading}
              rows={3}
              className="border-gray-200 focus-visible:border-teal focus-visible:ring-teal/20"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label className="font-heading text-sm text-gray-700">EDF file *</Label>
            <FileUpload onUploadComplete={handleUploadComplete} />
            {fileError && (
              <p className="text-sm text-red-600">Please upload a file</p>
            )}
          </div>

          {/* Error and success messages */}
          {error && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 p-3 rounded-md border border-green-200">
              <p className="text-sm text-green-700">✓ Study created successfully</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !uploadedFile || !patientRef || !studyType}
            className="w-full bg-teal text-white hover:bg-teal/90"
          >
            {loading ? "Creating study..." : "Submit study"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
