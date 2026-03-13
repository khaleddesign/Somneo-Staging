"use client"
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface StudyActionsProps {
  studyId: string
  currentStatus: 'en_attente' | 'en_cours' | 'termine' | 'annule'
  reportPath?: string | null
}

type StudyStatus = StudyActionsProps['currentStatus']

const statusOptions = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
  { value: 'annule', label: 'Annulé' },
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
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setSuccess('Statut mis à jour')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur'
      setError(message)
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
      
      // Récupérer l'utilisateur actuel (agent)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUploadError('Session expirée. Veuillez vous reconnecter.')
        setUploading(false)
        return
      }

      // Vérifier que le fichier est un PDF
      if (file.type !== 'application/pdf') {
        setUploadError('Seuls les fichiers PDF sont acceptés')
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
        throw new Error(uploadData.error || 'Erreur lors de l\'upload')
      }

      // 2. Mettre à jour le statut en 'termine' via l'API de statut existante (qui gère l'historique)
      const statusRes = await fetch(`/api/studies/${studyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'termine' }),
      })

      if (!statusRes.ok) {
        const statusData = await statusRes.json()
        console.error('Erreur mise à jour statut:', statusData.error)
        // Non-bloquant si l'upload a fonctionné
      }

      // 3. Récupérer l'email du client (si on l'a)
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
                subject: 'SomnoConnect - Votre rapport d\'étude du sommeil est disponible',
                message: `<p>Bonjour,</p><p>Votre rapport d'étude du sommeil est désormais disponible sur votre tableau de bord SomnoConnect.</p><p>Merci d'utiliser notre service.</p>`,
              }),
            }).catch((err) => {
              console.error('Notification email échouée :', err)
            })
          }
        } catch (e) {
          console.error('Impossible de récupérer l\'email du client :', e)
        }
      }

      // Succès : réinitialiser le formulaire et mettre à jour le statut local
      setUploadSuccess('Rapport PDF uploadé et étude marquée comme terminée')
      setFile(null)
      setStatus('termine')
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Recharger la page après 2 secondes pour refléter le nouveau statut
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setUploadError(message)
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
          {loading ? 'Mise à jour...' : 'Mettre à jour le statut'}
        </Button>
      </div>
      {success && <div className="text-green-600 text-sm">{success}</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {reportPath && (
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <p className="text-sm text-indigo-900 font-medium mb-2">Rapport actuel</p>
          <a
            href={`/api/studies/${studyId}/report?path=${encodeURIComponent(reportPath)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline text-sm"
          >
            📄 Voir le rapport PDF
          </a>
        </div>
      )}
      {status !== 'termine' && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
          <p className="text-sm text-blue-900 font-medium">Uploader le rapport PDF</p>
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
                'Uploader'
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
