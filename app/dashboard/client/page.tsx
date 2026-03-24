"use client"

import { useMemo } from 'react'
import { useStudies } from '@/hooks/useStudies'
import { StudySubmissionForm } from '@/components/custom/StudySubmissionForm'
import { StudyList } from '@/components/custom/StudyList'
import AppLayout from '@/components/custom/AppLayout'
import { BarChart3, Clock, CheckCircle2, AlertCircle, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ClientDashboard() {
  const { studies, loading, error, refresh } = useStudies()
  const { studies: instStudies } = useStudies(100, 'institution')

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
      <div className="p-5 md:p-8 space-y-8 bg-[#f0f4f8]">
        <div>
          <h1 className="text-4xl lg:text-5xl text-midnight font-display leading-tight">My Client Portal</h1>
          <p className="text-gray-500 mt-2 font-body">Track and submit your sleep studies</p>
        </div>
        
        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <Card className="shadow-sm border-gray-100 rounded-2xl bg-white transition-all hover:shadow-md hover:-translate-y-px">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-heading">Total studies</p>
                  <p className="text-3xl text-midnight font-display">{stats.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-teal/8">
                  <BarChart3 className="h-6 w-6 text-teal" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-100 rounded-2xl bg-white transition-all hover:shadow-md hover:-translate-y-px">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-heading">Pending</p>
                  <p className="text-3xl text-midnight font-display">{stats.enAttente}</p>
                </div>
                <div className="p-3 rounded-xl bg-teal/8">
                  <AlertCircle className="h-6 w-6 text-gold" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-100 rounded-2xl bg-white transition-all hover:shadow-md hover:-translate-y-px">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-heading">In progress</p>
                  <p className="text-3xl text-midnight font-display">{stats.enCours}</p>
                </div>
                <div className="p-3 rounded-xl bg-teal/8">
                  <Clock className="h-6 w-6 text-teal" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-100 rounded-2xl bg-white transition-all hover:shadow-md hover:-translate-y-px">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-heading">Completed</p>
                  <p className="text-3xl text-midnight font-display">{stats.termine}</p>
                </div>
                <div className="p-3 rounded-xl bg-teal/8">
                  <CheckCircle2 className="h-6 w-6 text-gold" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-100 rounded-2xl bg-white transition-all hover:shadow-md hover:-translate-y-px">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-2 font-heading">My institution</p>
                  <p className="text-3xl text-midnight font-display">{instStudies.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-teal/8">
                  <Building2 className="h-6 w-6 text-teal" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl text-midnight font-heading">New submission</CardTitle>
          </CardHeader>
          <CardContent>
            <StudySubmissionForm onSuccess={refresh} />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl text-midnight font-heading">My studies</CardTitle>
          </CardHeader>
          <CardContent>
            <StudyList studies={studies} loading={loading} error={error} role="client" />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
