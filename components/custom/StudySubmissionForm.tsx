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
  const supabaseRef = useRef(createClient())

  const handleUploadComplete = (data: UploadedFileData) => {
    setUploadedFile(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientRef || !studyType || !uploadedFile) {
      setError('Veuillez remplir tous les champs requis et uploader un fichier')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = supabaseRef.current
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setLoading(false)
        return
      }

      // Créer l'enregistrement dans la table studies
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
        setError('Erreur lors de la création de l\'étude : ' + insertError.message)
        return
      }

      setSuccess(true)
      setPatientRef('')
      setStudyType('')
      setPriority('medium')
      setNotes('')
      setUploadedFile(null)

      // Rafraîchir la liste des études après 2 secondes
      setTimeout(() => {
        onSuccess?.()
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Soumettre une nouvelle étude</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Reference */}
          <div className="space-y-2">
            <Label htmlFor="patient-ref">Référence patient *</Label>
            <Input
              id="patient-ref"
              value={patientRef}
              onChange={(e) => setPatientRef(e.target.value)}
              placeholder="Ex: PAT-2026-001"
              required
              disabled={loading}
            />
          </div>

          {/* Study Type */}
          <div className="space-y-2">
            <Label htmlFor="study-type">Type d'étude *</Label>
            <Select value={studyType} onValueChange={setStudyType} disabled={loading}>
              <SelectTrigger id="study-type">
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PSG">PSG (Polysomnographie)</SelectItem>
                <SelectItem value="PV">PV (Polygraphie)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priorité</Label>
            <Select value={priority} onValueChange={setPriority} disabled={loading}>
              <SelectTrigger id="priority">
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
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations supplémentaires..."
              disabled={loading}
              rows={3}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Fichier EDF *</Label>
            <FileUpload onUploadComplete={handleUploadComplete} />
          </div>

          {/* Messages d'erreur et succès */}
          {error && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 p-3 rounded-md border border-green-200">
              <p className="text-sm text-green-700">✓ Étude créée avec succès</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !uploadedFile || !patientRef || !studyType}
            className="w-full"
          >
            {loading ? 'Création de l\'étude...' : 'Soumettre l\'étude'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
