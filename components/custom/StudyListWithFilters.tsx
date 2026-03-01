"use client"

import { useMemo, useState } from 'react'
import { Study } from '@/hooks/useStudies'
import { StudyList } from './StudyList'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface StudyListWithFiltersProps {
  studies: Study[]
  loading: boolean
  error: string | null
  role: 'agent' | 'client'
}

export default function StudyListWithFilters({
  studies,
  loading,
  error,
  role,
}: StudyListWithFiltersProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const filteredStudies = useMemo(() => {
    let result = studies

    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter)
    }

    if (priorityFilter !== 'all') {
      result = result.filter((s) => s.priority === priorityFilter)
    }

    return result
  }, [studies, statusFilter, priorityFilter])

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="termine">Terminée</SelectItem>
              <SelectItem value="annule">Annulée</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les priorités</SelectItem>
              <SelectItem value="low">Basse</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="high">Haute</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(statusFilter !== 'all' || priorityFilter !== 'all') && (
          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter('all')
                setPriorityFilter('all')
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Réinitialiser filtres
            </button>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-4">
          {filteredStudies.length} étude{filteredStudies.length !== 1 ? 's' : ''}
        </p>
        <StudyList
          studies={filteredStudies}
          loading={loading}
          error={error}
          role={role}
        />
      </div>
    </div>
  )
}
