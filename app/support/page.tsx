"use client"

import { useState } from 'react'
import AppLayout from '@/components/custom/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

const supportSubjects = [
  'Question technique',
  'Problème upload',
  'Facturation',
  'Autre',
] as const

export default function SupportPage() {
  const [subject, setSubject] = useState<string>('Question technique')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!message.trim()) {
      setError('Veuillez saisir un message.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Impossible d\'envoyer votre demande')
      }

      setSuccess('Votre demande a été envoyée avec succès.')
      setMessage('')
      setSubject('Question technique')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inattendue'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-5 md:p-8 space-y-6">
        <div>
          <h1 className="text-4xl lg:text-5xl text-midnight font-display leading-tight">Support & Contact</h1>
          <p className="text-gray-500 mt-2 font-body">Notre équipe SOMNOVENTIS est disponible pour vous aider.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="font-heading text-midnight">Support email</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-body text-midnight">contact@somnoventis.com</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle className="font-heading text-midnight">Téléphone / WhatsApp</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-body text-midnight">+33 6 12 34 56 78</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="font-heading text-midnight">Formulaire de contact</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-heading text-midnight">Sujet</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supportSubjects.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-heading text-midnight">Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Décrivez votre demande..."
                  rows={6}
                  className="font-body"
                />
              </div>

              {error && <p className="text-sm text-red-600 font-body">{error}</p>}
              {success && <p className="text-sm text-green-600 font-body">{success}</p>}

              <Button type="submit" disabled={loading} className="bg-teal text-white hover:bg-teal/90">
                {loading ? 'Envoi...' : 'Envoyer'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
