"use client"

import { useState } from 'react'
import useUpload from '@/hooks/useUpload'

const studyTypes = [
  { value: 'PSG', label: 'PSG' },
  { value: 'PV', label: 'PV' },
]
const priorities = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
]

export default function UploadStudy() {
  const [patientReference, setPatientReference] = useState('')
  const [studyType, setStudyType] = useState('PSG')
  const [priority, setPriority] = useState('medium')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [studyId, setStudyId] = useState<string | null>(null)

  const {
    progress,
    status,
    errorMessage,
    startUpload,
    cancel,
  } = useUpload()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!file) {
      setError('Veuillez sélectionner un fichier')
      return
    }
    try {
      const res = await fetch('/api/studies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_reference: patientReference,
          study_type: studyType,
          notes,
          priority,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Erreur lors de la création de l\'étude')
        return
      }
      setStudyId(json.study_id)
      startUpload(file, json.study_id)
    } catch (err: any) {
      setError(err?.message ?? 'Erreur réseau')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">Envoyer une nouvelle étude</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">ID patient anonymisé</label>
          <input
            className="mt-1 block w-full rounded-md border px-3 py-2"
            value={patientReference}
            onChange={(e) => setPatientReference(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Type d'étude</label>
          <select
            className="mt-1 block w-full rounded-md border px-3 py-2"
            value={studyType}
            onChange={(e) => setStudyType(e.target.value)}
            required
          >
            {studyTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Priorité</label>
          <select
            className="mt-1 block w-full rounded-md border px-3 py-2"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            required
          >
            {priorities.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Notes</label>
          <textarea
            className="mt-1 block w-full rounded-md border px-3 py-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Fichier PSG/EDF</label>
          <input
            className="mt-1 block w-full rounded-md border px-3 py-2"
            type="file"
            accept="*/*"
            onChange={handleFileChange}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="inline-flex items-center rounded bg-slate-800 px-4 py-2 text-white"
          disabled={status === 'uploading'}
        >
          {status === 'uploading' ? 'Envoi en cours...' : 'Envoyer'}
        </button>
        {status === 'uploading' && (
          <div className="mt-4">
            <div className="w-full bg-slate-200 rounded h-4">
              <div
                className="bg-blue-600 h-4 rounded"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm mt-2">Progression : {progress}%</p>
            <button
              type="button"
              className="mt-2 px-4 py-2 rounded bg-red-600 text-white"
              onClick={cancel}
            >Annuler</button>
          </div>
        )}
        {status === 'done' && (
          <p className="text-green-600 mt-4 font-semibold">Étude envoyée avec succès !</p>
        )}
        {status === 'error' && errorMessage && (
          <p className="text-red-600 mt-4">{errorMessage}</p>
        )}
      </form>
    </div>
  )
}
