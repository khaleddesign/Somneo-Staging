'use client'

import { useMemo } from 'react'
import { useStudies } from '@/hooks/useStudies'
import { StudyList } from '@/components/custom/StudyList'
import StudyListWithFilters from '@/components/custom/StudyListWithFilters'
import AppLayout from '@/components/custom/AppLayout'

export default function StudiesPage() {
  const { studies, loading, error } = useStudies()
  const enAttente = useMemo(() => studies.filter(s => s.status === 'en_attente'), [studies])

  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Syne, sans-serif' }}>
          Études
        </h1>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Études en attente</h2>
          <StudyList studies={enAttente} loading={loading} error={error} role="agent" />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Toutes les études</h2>
          <StudyListWithFilters studies={studies} loading={loading} error={error} role="agent" />
        </section>
      </div>
    </AppLayout>
  )
}
