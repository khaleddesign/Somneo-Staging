"use client"

import { useStudies } from '@/hooks/useStudies'
import { StudyList } from '@/components/custom/StudyList'
import InviteForm from '@/components/custom/InviteForm'
import { useMemo } from 'react'

export default function AgentDashboard() {
  const { studies, loading, error, refresh } = useStudies()
  const enAttente = useMemo(() => studies.filter(s => s.status === 'en_attente'), [studies])

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard Agent</h1>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="px-4 py-2 bg-gray-200 rounded">Logout</button>
        </form>
      </div>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Études en attente</h2>
        <StudyList studies={enAttente} loading={loading} error={error} role="agent" />
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Toutes les études</h2>
        <StudyList studies={studies} loading={loading} error={error} role="agent" />
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-4">Inviter un client</h2>
        <InviteForm onInvite={refresh} />
      </section>
    </div>
  )
}
