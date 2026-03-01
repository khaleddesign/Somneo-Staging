"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { User, Lock, Mail } from 'lucide-react'

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="relative">
        <Label htmlFor="name" className="sr-only">
          Nom complet
        </Label>
        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#06111f]/50" />
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
          className="pl-10"
        />
      </div>

      <div className="relative">
        <Label htmlFor="email" className="sr-only">
          Email
        </Label>
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#06111f]/50" />
        <Input
          id="email"
          type="email"
          value={email}
          disabled
          className="pl-10 bg-slate-100"
        />
      </div>

      <div className="relative">
        <Label htmlFor="password" className="sr-only">
          Mot de passe
        </Label>
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#06111f]/50" />
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          className="pl-10"
        />
      </div>

      <div className="relative">
        <Label htmlFor="confirm" className="sr-only">
          Confirmer le mot de passe
        </Label>
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#06111f]/50" />
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          disabled={loading}
          className="pl-10"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full bg-[#1ec8d4] text-white hover:bg-[#17adb8]"
        disabled={loading}
      >
        {loading ? 'Création...' : 'Créer mon compte'}
      </Button>
    </form>
  )
}
