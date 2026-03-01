"use client"

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useStudies } from '@/hooks/useStudies'
import { StudySubmissionForm } from '@/components/custom/StudySubmissionForm'
import { StudyList } from '@/components/custom/StudyList'
import Header from '@/components/custom/Header'
import { BarChart3, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ClientDashboard() {
  const { studies, loading, error, refresh } = useStudies()
  const router = useRouter()

  // Calculate stats from studies
  const stats = useMemo(() => {
    const total = studies.length
    const enAttente = studies.filter(s => s.status === 'en_attente').length
    const enCours = studies.filter(s => s.status === 'en_cours').length
    const termine = studies.filter(s => s.status === 'termine').length
    return { total, enAttente, enCours, termine }
  }, [studies])

  return (
    <>
      <Header />
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Mon espace client</h1>
        
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total études</p>
                <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
              </div>
              <BarChart3 className="h-10 w-10 text-gray-400" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">En attente</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.enAttente}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">En cours</p>
                <p className="text-3xl font-bold text-blue-600">{stats.enCours}</p>
              </div>
              <Clock className="h-10 w-10 text-blue-400" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Terminées</p>
                <p className="text-3xl font-bold text-green-600">{stats.termine}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-400" />
            </div>
          </div>
        </div>

        <StudySubmissionForm onSuccess={refresh} />
        <hr className="my-8" />
        <h2 className="text-xl font-semibold mb-4">Mes études</h2>
        <StudyList studies={studies} loading={loading} error={error} role="client" />
      </div>
    </>
  )
}
