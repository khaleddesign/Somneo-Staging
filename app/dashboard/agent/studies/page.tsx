'use client'

import { useEffect, useMemo, useState } from 'react'
import { useStudies } from '@/hooks/useStudies'
import { StudyList } from '@/components/custom/StudyList'
import AppLayout from '@/components/custom/AppLayout'
import { createClient } from '@/lib/supabase/client'

export default function StudiesPage() {
  const { studies, loading, error, refresh } = useStudies()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function fetchCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)
    }

    fetchCurrentUser()
  }, [])

  const poolStudies = useMemo(
    () => studies.filter((s) => s.assigned_agent_id === null),
    [studies],
  )

  const myInProgressStudies = useMemo(
    () =>
      studies.filter(
        (s) => s.assigned_agent_id === currentUserId && s.status === 'en_cours',
      ),
    [studies, currentUserId],
  )

  const myCompletedStudies = useMemo(
    () =>
      studies.filter(
        (s) => s.assigned_agent_id === currentUserId && s.status === 'termine',
      ),
    [studies, currentUserId],
  )

  return (
    <AppLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Syne, sans-serif' }}>
          Études
        </h1>

        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Pool d'études disponibles</h2>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-teal-100 text-teal-700">
              {poolStudies.length} étude{poolStudies.length > 1 ? 's' : ''} disponible{poolStudies.length > 1 ? 's' : ''}
            </span>
          </div>
          <StudyList
            studies={poolStudies}
            loading={loading}
            error={error}
            role="agent"
            currentUserId={currentUserId}
            onAssigned={refresh}
          />
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Mes études en cours</h2>
          <StudyList
            studies={myInProgressStudies}
            loading={loading}
            error={error}
            role="agent"
            currentUserId={currentUserId}
          />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Mes études terminées</h2>
          <StudyList
            studies={myCompletedStudies}
            loading={loading}
            error={error}
            role="agent"
            currentUserId={currentUserId}
          />
        </section>
      </div>
    </AppLayout>
  )
}
