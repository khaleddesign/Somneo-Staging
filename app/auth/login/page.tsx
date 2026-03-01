"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'client') {
      router.push('/dashboard/client')
    } else {
      router.push('/dashboard/agent')
    }
  }


  return (
    <div className="min-h-screen bg-[#06111f] flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-[#f0e8d6]">
        <CardHeader>
          <CardTitle>
            <div className="text-center">
              <h1 className="text-2xl font-syne text-[#06111f]">SOMNOVENTIS</h1>
              <p className="text-sm text-[#06111f] opacity-80">SomnoConnect</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#06111f]/50" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Email professionnel"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#06111f]/50" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 p-2 rounded-md border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#1ec8d4] text-[#06111f] font-bold"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>

            <p className="text-center mt-2">
              <a href="#" className="text-[#06111f] underline text-sm">Mot de passe oublié ?</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
