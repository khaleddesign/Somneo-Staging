"use client"
import { Study } from '@/hooks/useStudies'
import { FC } from 'react'
import { Package } from 'lucide-react'

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
  role?: 'agent' | 'client'
}

export const StudyList: FC<StudyListProps> = ({ studies, loading, error, role = 'client' }) => {
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
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-3 py-2 border">ID Patient</th>
            <th className="px-3 py-2 border">Type</th>
            <th className="px-3 py-2 border">Priorité</th>
            <th className="px-3 py-2 border">Statut</th>
            <th className="px-3 py-2 border">Date de soumission</th>
            <th className="px-3 py-2 border text-center">Archive</th>
            <th className="px-3 py-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {studies.map((study) => (
            <tr key={study.id} className="border-b">
              <td className="px-3 py-2 border">{study.patient_reference}</td>
              <td className="px-3 py-2 border">{study.study_type}</td>
              <td className="px-3 py-2 border">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${priorityColors[study.priority]}`}>{study.priority}</span>
              </td>
              <td className="px-3 py-2 border">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[study.status]}`}>{study.status.replace('_', ' ')}</span>
              </td>
              <td className="px-3 py-2 border">{new Date(study.submitted_at).toLocaleDateString('fr-FR')}</td>
              <td className="px-3 py-2 border text-center">
                {study.archived_at ? (
                  <span title={`Archivé le ${new Date(study.archived_at).toLocaleDateString('fr-FR')}`}>
                    <Package className="h-5 w-5 text-gray-500 inline" />
                  </span>
                ) : (
                  ''
                )}
              </td>
              <td className="px-3 py-2 border">
                {role === 'agent' ? (
                  <a
                    href={`/dashboard/agent/studies/${study.id}`}
                    className="px-2 py-1 bg-blue-100 rounded text-xs text-blue-700 hover:bg-blue-200"
                  >
                    Voir
                  </a>
                ) : (
                  <a
                    href={`/dashboard/client/studies/${study.id}`}
                    className="px-2 py-1 bg-gray-200 rounded text-xs text-gray-700 hover:bg-gray-300"
                  >
                    Voir
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
