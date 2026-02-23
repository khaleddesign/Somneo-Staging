"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SignupFormProps {
  token: string
  email: string
  fullName?: string | null
}

export default function SignupForm({ token, email, fullName }: SignupFormProps) {
  const [name, setName] = useState(fullName ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Mot de passe trop court (>=8 caractères)')
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Erreur')
        setLoading(false)
        return
      }

      router.push(data.redirect)
    } catch (err: any) {
      setError(err?.message ?? 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Nom complet</label>
        <input
          className="mt-1 block w-full rounded-md border px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Mot de passe</label>
        <input
          className="mt-1 block w-full rounded-md border px-3 py-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Confirmer le mot de passe</label>
        <input
          className="mt-1 block w-full rounded-md border px-3 py-2"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className="inline-flex items-center rounded bg-slate-800 px-4 py-2 text-white"
        disabled={loading}
      >
        {loading ? 'Création...' : 'Créer mon compte'}
      </button>
    </form>
  )
}
