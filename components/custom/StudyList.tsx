"use client"
import { Study } from '@/hooks/useStudies'
import { FC, useState } from 'react'
import { AlertTriangle, Package } from 'lucide-react'

const priorityColors = {
  low: 'bg-gray-200 text-gray-700',
  medium: 'bg-blue-200 text-blue-700',
  high: 'bg-red-200 text-red-700',
}
const statusColors = {
  en_attente: 'bg-yellow-200 text-yellow-800',
  en_cours: 'bg-blue-200 text-blue-800',
  termine: 'bg-green-200 text-green-800',
  annule: 'bg-red-200 text-red-800',
}

interface StudyListProps {
  studies: Study[]
  loading: boolean
  error: string | null
  role?: 'agent' | 'client' | 'admin'
  currentUserId?: string | null
  onAssigned?: () => void
}

export const StudyList: FC<StudyListProps> = ({
  studies,
  loading,
  error,
  role = 'client',
  currentUserId = null,
  onAssigned,
}) => {
  const [assigningStudyId, setAssigningStudyId] = useState<string | null>(null)

  function isSlaBreached(study: Study) {
    if (study.priority !== 'high' || study.status !== 'en_attente') return false
    const submittedAt = new Date(study.submitted_at).getTime()
    const now = Date.now()
    const twentyFourHoursMs = 24 * 60 * 60 * 1000
    return now - submittedAt > twentyFourHoursMs
  }

  async function handleAssign(studyId: string) {
    setAssigningStudyId(studyId)
    try {
      const res = await fetch(`/api/studies/${studyId}/assign`, { method: 'PATCH' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Impossible de prendre en charge cette étude')
      }
      onAssigned?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l’assignation'
      alert(message)
    } finally {
      setAssigningStudyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }
  if (error) {
    return <div className="text-red-600">Erreur : {error}</div>
  }
  if (!studies.length) {
    return <div className="text-center text-gray-500 py-8">Aucune étude pour le moment</div>
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-100 text-sm bg-white rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-3 border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wider font-heading">ID Patient</th>
            <th className="px-3 py-3 border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wider font-heading">Type</th>
            <th className="px-3 py-3 border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wider font-heading">Priorité</th>
            <th className="px-3 py-3 border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wider font-heading">Statut</th>
            <th className="px-3 py-3 border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wider font-heading">Date de soumission</th>
            <th className="px-3 py-3 border-b border-gray-100 text-center text-xs text-gray-500 uppercase tracking-wider font-heading">Archive</th>
            <th className="px-3 py-3 border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wider font-heading">Actions</th>
          </tr>
        </thead>
        <tbody>
          {studies.map((study) => (
            <tr key={study.id} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
              <td className="px-3 py-3">{study.patient_reference}</td>
              <td className="px-3 py-3">{study.study_type}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${priorityColors[study.priority]}`}>{study.priority}</span>
                  {isSlaBreached(study) && (
                    <span
                      title="SLA dépassé"
                      className="inline-flex items-center gap-1 text-xs text-red-600 font-medium animate-pulse"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      SLA dépassé
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-3">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[study.status]}`}>{study.status.replace('_', ' ')}</span>
              </td>
              <td className="px-3 py-3">{new Date(study.submitted_at).toLocaleDateString('fr-FR')}</td>
              <td className="px-3 py-3 text-center">
                {study.archived_at ? (
                  <span title={`Archivé le ${new Date(study.archived_at).toLocaleDateString('fr-FR')}`}>
                    <Package className="h-5 w-5 text-gray-500 inline" />
                  </span>
                ) : (
                  ''
                )}
              </td>
              <td className="px-3 py-3">
                {role === 'agent' ? (
                  !study.assigned_agent_id ? (
                    <button
                      type="button"
                      onClick={() => handleAssign(study.id)}
                      disabled={assigningStudyId === study.id}
                      className="bg-teal text-white text-sm px-3 py-1 rounded-lg hover:bg-teal/90 disabled:opacity-60"
                    >
                      {assigningStudyId === study.id ? 'Assignation...' : 'Prendre en charge'}
                    </button>
                  ) : study.assigned_agent_id === currentUserId ? (
                    <a
                      href={`/dashboard/agent/studies/${study.id}`}
                      className="border border-teal text-teal text-sm px-3 py-1 rounded-lg hover:bg-teal/5"
                    >
                      Voir
                    </a>
                  ) : null
                ) : role === 'client' ? (
                  <a
                    href={`/dashboard/client/studies/${study.id}`}
                    className="px-2 py-1 bg-gray-200 rounded text-xs text-gray-700 hover:bg-gray-300"
                  >
                    Voir
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
