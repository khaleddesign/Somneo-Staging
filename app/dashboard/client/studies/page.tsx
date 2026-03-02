"use client"

import AppLayout from '@/components/custom/AppLayout'
import { StudyList } from '@/components/custom/StudyList'
import { useStudies } from '@/hooks/useStudies'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ClientStudiesPage() {
  const { studies, loading, error } = useStudies()

  return (
    <AppLayout>
      <div className="p-5 md:p-8 space-y-6">
        <div>
          <h1 className="text-4xl lg:text-5xl text-midnight font-display leading-tight">Mes études envoyées</h1>
          <p className="text-gray-500 mt-2 font-body">Retrouvez l'historique de toutes vos soumissions.</p>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl text-midnight font-heading">Liste des études</CardTitle>
          </CardHeader>
          <CardContent>
            <StudyList studies={studies} loading={loading} error={error} role="client" />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
