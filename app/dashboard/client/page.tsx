
"use client"

import { useStudies } from '@/hooks/useStudies'
import { StudySubmissionForm } from '@/components/custom/StudySubmissionForm'
import { StudyList } from '@/components/custom/StudyList'

export default function ClientDashboard() {
  const { studies, loading, error, refresh } = useStudies()
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Mon espace client</h1>
      <StudySubmissionForm onSuccess={refresh} />
      <hr className="my-8" />
      <h2 className="text-xl font-semibold mb-4">Mes études</h2>
      <StudyList studies={studies} loading={loading} error={error} role="client" />
    </div>
  )
}
