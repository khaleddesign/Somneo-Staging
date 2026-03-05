'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '@/components/custom/AdminLayout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import StudyListWithFilters from '@/components/custom/StudyListWithFilters'

interface Study {
  id: string
  patient_reference: string
  study_type: 'PSG' | 'PV'
  priority: 'low' | 'medium' | 'high'
  status: 'en_attente' | 'en_cours' | 'termine' | 'annule'
  submitted_at: string
  assigned_agent_id: string | null
  client_id: string
  profiles?: { full_name: string | null; email: string | null }
}

interface Agent {
  id: string
  full_name: string | null
  email: string
  role?: string
}

interface Client {
  id: string
  full_name: string | null
  email: string
}

export default function AdminStudiesPage() {
  const [studies, setStudies] = useState<Study[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [agent, setAgent] = useState('all')
  const [client, setClient] = useState('all')
  const [date, setDate] = useState('')

  const [reassignOpen, setReassignOpen] = useState(false)
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null)
  const [newAgentId, setNewAgentId] = useState<string>('unassigned')

  useEffect(() => {
    const queryAgent = new URLSearchParams(window.location.search).get('agent')
    if (queryAgent) {
      setAgent(queryAgent)
    }

    async function load() {
      setLoading(true)
      const [studiesRes, agentsRes, clientsRes] = await Promise.all([
        fetch('/api/studies/list'),
        fetch('/api/agents'),
        fetch('/api/clients'),
      ])

      const studiesData = studiesRes.ok ? await studiesRes.json() : { studies: [] }
      const agentsData: { agents: Agent[] } = agentsRes.ok ? await agentsRes.json() : { agents: [] }
      const clientsData = clientsRes.ok ? await clientsRes.json() : { clients: [] }

      setStudies(studiesData.studies || [])
      setAgents((agentsData.agents || []).filter((a) => a.role !== 'client'))
      setClients((clientsData.clients || []) as Client[])
      setLoading(false)
    }

    load()
  }, [])

  const agentMap = useMemo(
    () => new Map(agents.map((a) => [a.id, a.full_name || a.email])),
    [agents],
  )

  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c.full_name || c.email])),
    [clients],
  )

  const filtered = useMemo(() => {
    return studies.filter((study) => {
      const statusMatch = status === 'all' || study.status === status
      const priorityMatch = priority === 'all' || study.priority === priority
      const agentMatch = agent === 'all' || (agent === 'unassigned' ? !study.assigned_agent_id : study.assigned_agent_id === agent)
      const clientMatch = client === 'all' || study.client_id === client
      const dateMatch =
        !date || new Date(study.submitted_at).toISOString().slice(0, 10) === date
      return statusMatch && priorityMatch && agentMatch && clientMatch && dateMatch
    })
  }, [studies, status, priority, agent, client, date])

  function openReassign(study: Study) {
    setSelectedStudy(study)
    setNewAgentId(study.assigned_agent_id || 'unassigned')
    setReassignOpen(true)
  }

  async function reassignStudy() {
    if (!selectedStudy) return
    await fetch('/api/studies/reassign', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        study_id: selectedStudy.id,
        assigned_agent_id: newAgentId === 'unassigned' ? null : newAgentId,
      }),
    })

    setStudies((current) =>
      current.map((study) =>
        study.id === selectedStudy.id
          ? {
              ...study,
              assigned_agent_id: newAgentId === 'unassigned' ? null : newAgentId,
            }
          : study,
      ),
    )

    setReassignOpen(false)
  }

  return (
    <AdminLayout>
      <div className="p-2 md:p-4 space-y-6 bg-[#f0f4f8]">
        <div>
          <h1 className="text-4xl text-midnight font-display">Toutes les études</h1>
          <p className="text-gray-500 font-body">Vision globale et réassignation des études</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-[#f8fafc] border-2 border-transparent rounded-xl focus:border-teal"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="termine">Terminée</SelectItem>
              <SelectItem value="annule">Annulée</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-[#f8fafc] border-2 border-transparent rounded-xl focus:border-teal"><SelectValue placeholder="Priorité" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes priorités</SelectItem>
              <SelectItem value="low">Basse</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="high">Haute</SelectItem>
            </SelectContent>
          </Select>

          <Select value={agent} onValueChange={setAgent}>
            <SelectTrigger className="bg-[#f8fafc] border-2 border-transparent rounded-xl focus:border-teal"><SelectValue placeholder="Agent" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous agents</SelectItem>
              <SelectItem value="unassigned">Non assignées</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={client} onValueChange={setClient}>
            <SelectTrigger className="bg-[#f8fafc] border-2 border-transparent rounded-xl focus:border-teal"><SelectValue placeholder="Client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-[#f8fafc] border-2 border-transparent rounded-xl focus-visible:border-teal" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 overflow-x-auto">
          <h2 className="text-lg text-midnight font-heading mb-4">Vue filtrable</h2>
          <StudyListWithFilters
            studies={filtered}
            loading={loading}
            error={null}
            role="admin"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 overflow-x-auto">
          <h2 className="text-lg text-midnight font-heading mb-4">Réassignation avancée</h2>
          <table className="min-w-full text-sm">
            <thead className="bg-[#fafbfc] border-b border-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Patient</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Client</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Statut</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Priorité</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Agent assigné</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Date</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((study) => (
                <tr key={study.id} className="border-t border-gray-100 hover:bg-teal/3 transition-colors">
                  <td className="px-3 py-3 font-body">{study.patient_reference}</td>
                  <td className="px-3 py-3 font-body">{study.profiles?.full_name || clientMap.get(study.client_id) || '—'}</td>
                  <td className="px-3 py-3 font-body">{study.status.replace('_', ' ')}</td>
                  <td className="px-3 py-3 font-body">{study.priority}</td>
                  <td className="px-3 py-3 font-body">{study.assigned_agent_id ? agentMap.get(study.assigned_agent_id) || '—' : 'Non assignée'}</td>
                  <td className="px-3 py-3 font-body">{new Date(study.submitted_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-3 py-3">
                    <Button className="bg-teal text-white hover:bg-teal/90" onClick={() => openReassign(study)}>
                      Réassigner
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500 font-body">Aucune étude trouvée</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Réassigner l'étude</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-heading">Agent</Label>
              <Select value={newAgentId} onValueChange={setNewAgentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Non assignée</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-teal text-white hover:bg-teal/90" onClick={reassignStudy}>
              Confirmer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
