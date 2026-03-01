'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/components/custom/AppLayout'
import { Loader2 } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  full_name: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', user.id)
          .single()

        setProfile({
          id: user.id,
          email: user.email || '',
          full_name: profileData?.full_name || '',
        })
      }
      setLoading(false)
    }

    fetchProfile()
  }, [])

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères')
      return
    }

    setPasswordLoading(true)

    try {
      const supabase = createClient()

      // Update password using updateUser
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      setSuccess('Mot de passe mis à jour avec succès')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setPasswordLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-600" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Syne, sans-serif' }}>
          Paramètres
        </h1>

        {/* Account Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Informations du compte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-600">Nom</Label>
              <p className="mt-1 text-lg font-medium text-gray-900">{profile?.full_name}</p>
            </div>
            <div>
              <Label className="text-gray-600">Email</Label>
              <p className="mt-1 text-lg font-medium text-gray-900">{profile?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Changer le mot de passe</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Mot de passe actuel</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={passwordLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={passwordLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={passwordLoading}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={passwordLoading}
                className="bg-teal-600 hover:bg-teal-700 text-white w-full"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  'Mettre à jour le mot de passe'
                )}
              </Button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
                {success}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
