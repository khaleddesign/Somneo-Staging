
"use client"

import { useStudies } from '@/hooks/useStudies'
import UploadStudy from '@/components/custom/UploadStudy'
import { StudyList } from '@/components/custom/StudyList'

export default function ClientDashboard() {
  const { studies, loading, error, refresh } = useStudies()
  // Pour déclencher refresh après upload, on passe la fonction à UploadStudy
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Mon espace client</h1>
      <UploadStudy onUploadSuccess={refresh} />
      <hr className="my-8" />
      <h2 className="text-xl font-semibold mb-4">Mes études</h2>
      <StudyList studies={studies} loading={loading} error={error} />
    </div>
  )
}
