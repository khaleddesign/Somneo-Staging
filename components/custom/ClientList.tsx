"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface Client {
  id: string
  full_name: string
  email: string
  created_at: string
  is_suspended: boolean
}

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  async function fetchClients() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/clients')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors du chargement')
      }
      const data = await res.json()
      setClients(data.clients || [])
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  async function handleToggleSuspend(clientId: string, currentSuspended: boolean) {
    const action = currentSuspended ? 'réactiver' : 'suspendre'
    if (!window.confirm(`Êtes-vous sûr de vouloir ${action} ce client ?`)) {
      return
    }

    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: clientId,
          is_suspended: !currentSuspended,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la mise à jour')
      }

      // Rafraîchir la liste
      await fetchClients()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      setError(message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Chargement des clients...</div>
  }

  if (error) {
    return <div className="bg-red-50 p-4 rounded border border-red-200 text-red-700 text-sm">{error}</div>
  }

  if (clients.length === 0) {
    return <div className="text-center py-8 text-gray-500">Aucun client enregistré</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="text-left px-4 py-3 font-semibold text-sm">Nom</th>
            <th className="text-left px-4 py-3 font-semibold text-sm">Email</th>
            <th className="text-left px-4 py-3 font-semibold text-sm">Inscription</th>
            <th className="text-left px-4 py-3 font-semibold text-sm">Statut</th>
            <th className="text-center px-4 py-3 font-semibold text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 text-sm">{client.full_name}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{client.email}</td>
              <td className="px-4 py-3 text-sm">
                {new Date(client.created_at).toLocaleDateString('fr-FR')}
              </td>
              <td className="px-4 py-3 text-sm">
                {client.is_suspended ? (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Suspendu
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Actif
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <Button
                  onClick={() => handleToggleSuspend(client.id, client.is_suspended)}
                  disabled={actionLoading}
                  size="sm"
                  variant={client.is_suspended ? 'default' : 'destructive'}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : client.is_suspended ? (
                    'Réactiver'
                  ) : (
                    'Suspendre'
                  )}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
