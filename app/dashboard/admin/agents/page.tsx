'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/custom/AdminLayout'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Ban, Trash2, Search } from 'lucide-react'

interface Agent {
  id: string
  full_name: string | null
  email: string
  role: 'agent' | 'admin'
  is_suspended: boolean
  en_cours: number
  termine: number
}

export default function AdminAgentsPage() {
  const t = useTranslations('dashboard.admin.agentsPage')
  const common = useTranslations('common')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', role: 'agent' })
  const [inviteForm, setInviteForm] = useState({ full_name: '', email: '', role: 'agent' })
  const [submitting, setSubmitting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  async function fetchAgents() {
    setLoading(true)
    const res = await fetch('/api/agents')
    const data = await res.json()
    setAgents(data.agents || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  const filtered = useMemo(() => {
    const term = query.toLowerCase()
    return agents.filter((agent) =>
      `${agent.full_name || ''} ${agent.email}`.toLowerCase().includes(term),
    )
  }, [agents, query])

  async function inviteAgent() {
    setSubmitting(true)
    setInviteError(null)
    const roleToSend = inviteForm.role === 'admin' ? 'admin' : 'agent'
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: inviteForm.full_name,
        email: inviteForm.email,
        role: roleToSend,
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const message = data?.error || 'Error sending invitation'
      console.error('[AdminAgentsPage] invite error:', data)
      setInviteError(message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setInviteOpen(false)
    setInviteForm({ full_name: '', email: '', role: 'agent' })
  }

  function openEdit(agent: Agent) {
    setSelectedAgent(agent)
    setForm({ full_name: agent.full_name || '', email: agent.email, role: agent.role })
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!selectedAgent) return
    setSubmitting(true)
    await fetch('/api/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedAgent.id,
        full_name: form.full_name,
        email: form.email,
        is_suspended: selectedAgent.is_suspended,
      }),
    })
    setSubmitting(false)
    setEditOpen(false)
    await fetchAgents()
  }

  async function toggleSuspend(agent: Agent) {
    await fetch('/api/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: agent.id, is_suspended: !agent.is_suspended }),
    })
    await fetchAgents()
  }

  async function deleteAgent(agent: Agent) {
    if (!window.confirm(t('deleteConfirm', { name: agent.full_name || agent.email }))) return
    await fetch(`/api/agents?id=${agent.id}`, { method: 'DELETE' })
    await fetchAgents()
  }

  return (
    <AdminLayout>
      <div className="p-2 md:p-4 space-y-6 bg-[#f0f4f8]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl text-midnight font-display">{t('title')}</h1>
            <p className="text-gray-500 font-body">{t('subtitle')}</p>
          </div>
          <Button className="bg-teal text-white hover:bg-teal/90 rounded-xl font-heading" onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> {t('addAgent')}
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="relative mb-4 max-w-md">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              className="pl-9 bg-[#f8fafc] border-2 border-transparent rounded-xl focus-visible:border-teal focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-teal/6"
              placeholder={t('searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#fafbfc] border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">{t('name')}</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">{t('email')}</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">{t('studiesInProgress')}</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">{t('completedStudies')}</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">{t('status')}</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((agent) => (
                  <tr key={agent.id} className="border-t border-gray-100 hover:bg-teal/3 transition-colors">
                    <td className="px-3 py-3 font-body text-midnight">{agent.full_name || '—'}</td>
                    <td className="px-3 py-3 font-body">{agent.email}</td>
                    <td className="px-3 py-3 font-body">{agent.en_cours}</td>
                    <td className="px-3 py-3 font-body">{agent.termine}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-heading ${agent.is_suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {agent.is_suspended ? t('suspended') : t('active')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/dashboard/admin/studies?agent=${agent.id}`}>
                          <Button variant="outline" className="border-teal text-teal">{t('viewStudies')}</Button>
                        </Link>
                        <Button variant="outline" onClick={() => openEdit(agent)}>
                          <Pencil className="h-4 w-4 mr-1" /> {common('edit')}
                        </Button>
                        <Button variant="outline" onClick={() => toggleSuspend(agent)}>
                          <Ban className="h-4 w-4 mr-1" /> {agent.is_suspended ? t('reactivate') : t('suspend')}
                        </Button>
                        <Button className="bg-red-500 text-white hover:bg-red-600" onClick={() => deleteAgent(agent)}>
                          <Trash2 className="h-4 w-4 mr-1" /> {common('delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500 font-body">{t('noAgents')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">{t('inviteTitle')}</DialogTitle>
            <DialogDescription className="font-body text-gray-500">
              {t('inviteSubtitle')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-heading">{t('name')}</Label>
              <Input value={inviteForm.full_name} onChange={(e) => setInviteForm((s) => ({ ...s, full_name: e.target.value }))} />
            </div>
            <div>
              <Label className="font-heading">{t('email')}</Label>
              <Input value={inviteForm.email} onChange={(e) => setInviteForm((s) => ({ ...s, email: e.target.value }))} />
            </div>
            <div>
              <Label className="font-heading">{t('role')}</Label>
              <Select value={inviteForm.role} onValueChange={(value) => setInviteForm((s) => ({ ...s, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-teal text-white hover:bg-teal/90" disabled={submitting} onClick={inviteAgent}>
              {t('inviteTitle')}
            </Button>
            {inviteError && (
              <p className="text-sm text-red-600 font-body">{inviteError}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">{t('editTitle')}</DialogTitle>
            <DialogDescription className="font-body text-gray-500">
              {t('editSubtitle')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-heading">{t('name')}</Label>
              <Input value={form.full_name} onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} />
            </div>
            <div>
              <Label className="font-heading">{t('email')}</Label>
              <Input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            </div>
            <Button className="w-full bg-teal text-white hover:bg-teal/90" disabled={submitting} onClick={saveEdit}>
              {common('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
