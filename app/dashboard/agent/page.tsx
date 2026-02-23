"use client"

import { useState } from 'react'

export default function AgentDashboard() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLink(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName, institution_id: '00000000-0000-0000-0000-000000000001' }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Erreur')
        setLoading(false)
        return
      }

      const token = json.token
      const url = `${location.origin}/auth/signup?token=${token}`
      setLink(url)
    } catch (err: any) {
      setError(err?.message ?? 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold">Dashboard Agent</h1>
      <p className="text-slate-500 mt-2">Inviter un client</p>

      <form onSubmit={sendInvite} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            className="mt-1 block w-full rounded-md border bg-white px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Nom complet (optionnel)</label>
          <input
            className="mt-1 block w-full rounded-md border bg-white px-3 py-2"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Institution ID (optionnel)</label>
          <input
            className="mt-1 block w-full rounded-md border bg-white px-3 py-2"
            type="text"
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="inline-flex items-center rounded bg-slate-800 px-4 py-2 text-white"
          disabled={loading}
        >
          {loading ? 'Envoi...' : 'Envoyer l\'invitation'}
        </button>
      </form>

      {link && (
        <div className="mt-4 p-4 border rounded bg-slate-50">
          <p className="text-sm">Lien d'inscription (à copier manuellement) :</p>
          <pre className="mt-2 break-all text-sm text-slate-700">{link}</pre>
        </div>
      )}
    </div>
  )
}
