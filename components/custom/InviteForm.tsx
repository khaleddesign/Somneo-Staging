"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function InviteForm({ onInvite }: { onInvite?: () => void }) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInviteLink(null)

    const res = await fetch('/api/auth/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        full_name: fullName,
        institution_id: '00000000-0000-0000-0000-000000000001'
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Erreur lors de l'invitation")
      setLoading(false)
      return
    }

    setInviteLink(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/signup?token=${data.token}`
    )
    setEmail('')
    setFullName('')
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inviter un client</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label>Nom complet</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. Martin"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Email professionnel</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dr.martin@clinique.com"
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Envoi...' : "Envoyer l'invitation"}
          </Button>
        </form>
        {inviteLink && (
          <div className="mt-4 p-3 bg-green-50 rounded-md">
            <p className="text-sm text-green-700 font-medium">
              Lien d'invitation :
            </p>
            <p className="text-xs text-green-600 break-all mt-1">
              {inviteLink}
            </p>
          </div>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
