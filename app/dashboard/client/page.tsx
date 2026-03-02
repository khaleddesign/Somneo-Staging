"use client"

import { useMemo } from 'react'
import { useStudies } from '@/hooks/useStudies'
import { StudySubmissionForm } from '@/components/custom/StudySubmissionForm'
import { StudyList } from '@/components/custom/StudyList'
import AppLayout from '@/components/custom/AppLayout'
import { BarChart3, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
      <div className="p-5 md:p-8 space-y-8">
        <div>
          <h1 className="text-4xl lg:text-5xl text-midnight font-display leading-tight">Mon espace client</h1>
          <p className="text-gray-500 mt-2 font-body">Suivez et soumettez vos études du sommeil</p>
        </div>
        
        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="shadow-sm border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1 font-body">Total études</p>
                  <p className="text-3xl text-midnight font-display">{stats.total}</p>
                </div>
                <div className="p-3 rounded-full bg-teal/10">
                  <BarChart3 className="h-6 w-6 text-teal" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1 font-body">En attente</p>
                  <p className="text-3xl text-midnight font-display">{stats.enAttente}</p>
                </div>
                <div className="p-3 rounded-full bg-gold/10">
                  <AlertCircle className="h-6 w-6 text-gold" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1 font-body">En cours</p>
                  <p className="text-3xl text-midnight font-display">{stats.enCours}</p>
                </div>
                <div className="p-3 rounded-full bg-teal/10">
                  <Clock className="h-6 w-6 text-teal" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1 font-body">Terminées</p>
                  <p className="text-3xl text-midnight font-display">{stats.termine}</p>
                </div>
                <div className="p-3 rounded-full bg-gold/10">
                  <CheckCircle2 className="h-6 w-6 text-gold" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl text-midnight font-heading">Nouvelle soumission</CardTitle>
          </CardHeader>
          <CardContent>
            <StudySubmissionForm onSuccess={refresh} />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl text-midnight font-heading">Mes études</CardTitle>
          </CardHeader>
          <CardContent>
            <StudyList studies={studies} loading={loading} error={error} role="client" />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
