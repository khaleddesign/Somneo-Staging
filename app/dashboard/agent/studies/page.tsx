'use client'

import { useEffect, useMemo, useState } from 'react'
import { useStudies } from '@/hooks/useStudies'
import StudyListWithFilters from '@/components/custom/StudyListWithFilters'
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
      <div className="p-8 bg-[#f0f4f8]">
        <h1 className="text-4xl text-midnight font-display mb-8">
          Studies
        </h1>

        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl text-midnight font-heading">Available study pool</h2>
            <span className="bg-teal/10 text-teal font-heading text-sm px-3 py-1 rounded-full">
              {poolStudies.length} study{poolStudies.length !== 1 ? 's' : ''} available
            </span>
          </div>
          <StudyListWithFilters
            studies={poolStudies}
            loading={loading}
            error={error}
            role="agent"
            currentUserId={currentUserId}
            onAssigned={refresh}
          />
        </section>

        <section className="mb-10">
          <h2 className="text-xl mb-4 text-midnight font-heading">My studies en cours</h2>
          <StudyListWithFilters
            studies={myInProgressStudies}
            loading={loading}
            error={error}
            role="agent"
            currentUserId={currentUserId}
          />
        </section>

        <section>
          <h2 className="text-xl mb-4 text-midnight font-heading">My completed studies</h2>
          <StudyListWithFilters
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
