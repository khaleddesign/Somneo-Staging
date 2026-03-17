"use client"
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface StudyActionsProps {
  studyId: string
  currentStatus: 'en_attente' | 'en_cours' | 'termine' | 'annule'
  reportPath?: string | null
}

type StudyStatus = StudyActionsProps['currentStatus']

const statusOptions = [
  { value: 'en_attente', label: 'Pending' },
  { value: 'en_cours', label: 'In progress' },
  { value: 'termine', label: 'Completed' },
  { value: 'annule', label: 'Cancelled' },
]

export default function StudyActions({ studyId, currentStatus, reportPath }: StudyActionsProps) {
  const [status, setStatus] = useState<StudyStatus>(currentStatus)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabaseRef = useRef(createClient())

  async function handleStatusUpdate() {
    setLoading(true)
    setSuccess(null)
    setError(null)
    try {
      const res = await fetch(`/api/studies/${studyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setSuccess('Status updated')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error'
      setError(message)
      toast.error('Erreur de mise à jour', {
        description: message,
        action: {
          label: 'Réessayer',
          onClick: handleStatusUpdate,
        },
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleReportUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    
    setUploading(true)
    setUploadSuccess(null)
    setUploadError(null)

    try {
      const supabase = supabaseRef.current
      
      // Retrieve current user (agent)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUploadError('Session expired. Please sign in again.')
        setUploading(false)
        return
      }

      // Verify the file is a PDF
      if (file.type !== 'application/pdf') {
        setUploadError('Only PDF files are accepted')
        setUploading(false)
        return
      }

      // 1. Upload le fichier via l'API serveur (qui utilise le client admin)
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch(`/api/studies/${studyId}/report`, {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Error uploading file')
      }

      // 2. Update status to 'termine' via existing status API (which handles history)
      const statusRes = await fetch(`/api/studies/${studyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'termine' }),
      })

      if (!statusRes.ok) {
        const statusData = await statusRes.json()
        console.error('Error updating status:', statusData.error)
        // Non-blocking if upload succeeded
      }

      // 3. Retrieve client email (if available)
      const { data: studyData } = await supabase
        .from('studies')
        .select('client_id')
        .eq('id', studyId)
        .single()

      const clientId = studyData?.client_id
      if (clientId) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', clientId)
            .single()

          const clientEmail = profile?.email
          if (clientEmail) {
            fetch('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: clientEmail,
                subject: 'SomnoConnect - Your sleep study report is available',
                message: `<p>Hello,</p><p>Your sleep study report is now available on your SomnoConnect dashboard.</p><p>Thank you for using our service.</p>`,
              }),
            }).catch((err) => {
              console.error('Email notification failed:', err)
            })
          }
        } catch (e) {
          console.error('Unable to retrieve client email:', e)
        }
      }

      // Success: reset form and update local status
      setUploadSuccess('PDF report uploaded and study marked as completed')
      setFile(null)
      setStatus('termine')
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Reload page after 2 seconds to reflect new status
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setUploadError(message)
      toast.error('Erreur d\'upload', {
        description: message,
        action: {
          label: 'Réessayer',
          onClick: () => {
            if (file) handleReportUpload(new Event('submit') as unknown as React.FormEvent)
          },
        },
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Select value={status} onValueChange={(value) => setStatus(value as StudyStatus)} disabled={loading}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleStatusUpdate} disabled={loading || status === currentStatus}>
          {loading ? 'Updating...' : 'Update status'}
        </Button>
      </div>
      {success && <div className="text-green-600 text-sm">{success}</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {reportPath && (
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <p className="text-sm text-indigo-900 font-medium mb-2">Current report</p>
          <a
            href={`/api/studies/${studyId}/report?path=${encodeURIComponent(reportPath)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline text-sm"
          >
            📄 Voir le report PDF
          </a>
        </div>
      )}
      {status !== 'termine' && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
          <p className="text-sm text-blue-900 font-medium">Upload PDF report</p>
          <form onSubmit={handleReportUpload} className="flex items-center gap-3">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={e => setFile(e.target.files?.[0] || null)}
              disabled={uploading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={uploading || !file}
              size="sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Upload...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </form>
          
          {uploadSuccess && (
            <div className="bg-green-50 p-3 rounded border border-green-200 flex items-start gap-2">
              <span className="text-green-700 text-sm">✓ {uploadSuccess}</span>
            </div>
          )}
          
          {uploadError && (
            <div className="bg-red-50 p-3 rounded border border-red-200 flex items-start gap-2">
              <span className="text-red-700 text-sm">{uploadError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
