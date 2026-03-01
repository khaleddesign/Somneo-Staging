"use client"

import { useMemo } from 'react'
import { useStudies } from '@/hooks/useStudies'
import { StudyList } from '@/components/custom/StudyList'
import InviteForm from '@/components/custom/InviteForm'
import Header from '@/components/custom/Header'
import ClientList from '@/components/custom/ClientList'

export default function AgentDashboard() {
  const { studies, loading, error, refresh } = useStudies()
  const enAttente = useMemo(() => studies.filter(s => s.status === 'en_attente'), [studies])

  return (
    <>
      <Header />
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard Agent</h1>
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Études en attente</h2>
          <StudyList studies={enAttente} loading={loading} error={error} role="agent" />
        </section>
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Inviter un client</h2>
          <InviteForm />
        </section>
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Gestion des clients</h2>
          <ClientList />
        </section>
      </div>
    </>
  )
}
