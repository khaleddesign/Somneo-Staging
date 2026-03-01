"use client"

import { useMemo } from 'react'
import { useStudies } from '@/hooks/useStudies'
import { StudySubmissionForm } from '@/components/custom/StudySubmissionForm'
import { StudyList } from '@/components/custom/StudyList'
import AppLayout from '@/components/custom/AppLayout'
import { BarChart3, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ClientDashboard() {
  const { studies, loading, error, refresh } = useStudies()

  // Calculate stats from studies
  const stats = useMemo(() => {
    const total = studies.length
    const enAttente = studies.filter(s => s.status === 'en_attente').length
    const enCours = studies.filter(s => s.status === 'en_cours').length
    const termine = studies.filter(s => s.status === 'termine').length
    return { total, enAttente, enCours, termine }
  }, [studies])

  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Mon espace client</h1>
        
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-150">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total études</p>
                <p className="text-3xl font-bold text-[#06111f]">{stats.total}</p>
              </div>
              <BarChart3 className="h-10 w-10 text-[#1ec8d4]" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-150">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">En attente</p>
                <p className="text-3xl font-bold text-[#06111f]">{stats.enAttente}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-[#1ec8d4]" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-150">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">En cours</p>
                <p className="text-3xl font-bold text-[#06111f]">{stats.enCours}</p>
              </div>
              <Clock className="h-10 w-10 text-[#1ec8d4]" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-150">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Terminées</p>
                <p className="text-3xl font-bold text-[#06111f]">{stats.termine}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-[#1ec8d4]" />
            </div>
          </div>
        </div>

        <StudySubmissionForm onSuccess={refresh} />
        <hr className="my-8" />
        <h2 className="text-xl font-semibold mb-4">Mes études</h2>
        <StudyList studies={studies} loading={loading} error={error} role="client" />
      </div>
    </AppLayout>
  )
}
