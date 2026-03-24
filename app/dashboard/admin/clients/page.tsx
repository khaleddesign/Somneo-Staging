'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '@/components/custom/AdminLayout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Ban, Search } from 'lucide-react'

interface ClientRow {
  id: string
  full_name: string | null
  email: string
  institution_name?: string
  studies_count?: number
  last_study_at?: string | null
  is_suspended: boolean
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null)
  const [inviteForm, setInviteForm] = useState({ full_name: '', email: '' })
  const [form, setForm] = useState({ full_name: '', email: '' })
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [submittingInvite, setSubmittingInvite] = useState(false)

  async function fetchClients() {
    setLoading(true)
    const res = await fetch('/api/clients')
    const data = await res.json()
    setClients(data.clients || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const filtered = useMemo(() => {
    const term = query.toLowerCase()
    return clients.filter((client) =>
      `${client.full_name || ''} ${client.email}`.toLowerCase().includes(term),
    )
  }, [clients, query])

  async function inviteClient() {
    const normalizedEmail = inviteForm.email.trim().toLowerCase()
    const normalizedName = inviteForm.full_name.trim()

    if (!normalizedEmail) {
      setInviteError('Email required')
      return
    }

    setSubmittingInvite(true)
    setInviteError(null)

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: normalizedName,
        email: normalizedEmail,
        role: 'client',
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const message = data?.error || 'Error inviting client'
      setInviteError(message)
      setSubmittingInvite(false)
      return
    }

    setInviteOpen(false)
    setInviteForm({ full_name: '', email: '' })
    setSubmittingInvite(false)
  }

  function openEdit(client: ClientRow) {
    setSelectedClient(client)
    setForm({ full_name: client.full_name || '', email: client.email })
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!selectedClient) return
    await fetch('/api/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: selectedClient.id,
        full_name: form.full_name,
        email: form.email,
      }),
    })
    setEditOpen(false)
    await fetchClients()
  }

  async function toggleSuspend(client: ClientRow) {
    await fetch('/api/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: client.id, is_suspended: !client.is_suspended }),
    })
    await fetchClients()
  }

  return (
    <AdminLayout>
      <div className="p-2 md:p-4 space-y-6 bg-[#f0f4f8]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl text-midnight font-display">Client management</h1>
            <p className="text-gray-500 font-body">Complete client account management</p>
          </div>
          <Button className="bg-teal text-white hover:bg-teal/90 rounded-xl font-heading" onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Invite client
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="relative mb-4 max-w-md">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              className="pl-9 bg-[#f8fafc] border-2 border-transparent rounded-xl focus-visible:border-teal focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-teal/6"
              placeholder="Search client"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#fafbfc] border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Name</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Email</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Institution</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Studies submitted</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Last study</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Status</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} className="border-t border-gray-100 hover:bg-teal/3 transition-colors">
                    <td className="px-3 py-3 font-body text-midnight">{client.full_name || '—'}</td>
                    <td className="px-3 py-3 font-body">{client.email}</td>
                    <td className="px-3 py-3 font-body">{client.institution_name || '—'}</td>
                    <td className="px-3 py-3 font-body">{client.studies_count || 0}</td>
                    <td className="px-3 py-3 font-body">{client.last_study_at ? new Date(client.last_study_at).toLocaleDateString('en-GB') : '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-heading ${client.is_suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {client.is_suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => openEdit(client)}>
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" onClick={() => toggleSuspend(client)}>
                          <Ban className="h-4 w-4 mr-1" /> {client.is_suspended ? 'Reactivate' : 'Suspend'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-500 font-body">No clients</td>
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
            <DialogTitle className="font-heading">Invite client</DialogTitle>
            <DialogDescription className="font-body text-gray-500">
              Send a secure invitation to the SomnoConnect client portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-heading">Full name</Label>
              <Input value={inviteForm.full_name} onChange={(e) => setInviteForm((s) => ({ ...s, full_name: e.target.value }))} />
            </div>
            <div>
              <Label className="font-heading">Email</Label>
              <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm((s) => ({ ...s, email: e.target.value }))} />
            </div>
            <Button className="w-full bg-teal text-white hover:bg-teal/90" onClick={inviteClient} disabled={submittingInvite || !inviteForm.email.trim()}>
              {submittingInvite ? 'Sending...' : "Send invitation"}
            </Button>
            {inviteError && <p className="text-sm text-red-600 font-body">{inviteError}</p>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Edit client</DialogTitle>
            <DialogDescription className="font-body text-gray-500">
              Update the selected client's information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-heading">Full name</Label>
              <Input value={form.full_name} onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} />
            </div>
            <div>
              <Label className="font-heading">Email</Label>
              <Input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            </div>
            <Button className="w-full bg-teal text-white hover:bg-teal/90" onClick={saveEdit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
