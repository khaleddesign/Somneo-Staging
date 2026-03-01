import { getInvitationByToken } from '@/lib/supabase/invitations'
import SignupForm from '@/components/custom/SignupForm'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="min-h-screen bg-[#06111f] flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-[#f0e8d6]">
          <CardHeader>
            <CardTitle>
              <div className="text-center">
                <h1 className="text-2xl font-syne text-[#06111f]">Création de votre espace client</h1>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <h2 className="text-xl font-bold text-red-600">Lien invalide</h2>
              <p className="text-slate-700 mt-2">Token manquant dans l&#39;URL.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  let invitation = null
  let errorMsg = null

  try {
    invitation = await getInvitationByToken(token)
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : 'Erreur inconnue'
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#06111f] flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-[#f0e8d6]">
          <CardHeader>
            <CardTitle>
              <div className="text-center">
                <h1 className="text-2xl font-syne text-[#06111f]">Création de votre espace client</h1>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <h2 className="text-xl font-bold text-red-600">Erreur</h2>
              <p className="text-slate-700 mt-2">{errorMsg}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-[#06111f] flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-[#f0e8d6]">
          <CardHeader>
            <CardTitle>
              <div className="text-center">
                <h1 className="text-2xl font-syne text-[#06111f]">Création de votre espace client</h1>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <h2 className="text-xl font-bold text-red-600">Invitation expirée</h2>
              <p className="text-slate-700 mt-2">Ce lien est invalide ou déjà utilisé.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06111f] flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-[#f0e8d6]">
        <CardHeader>
          <CardTitle>
            <div className="text-center">
              <h1 className="text-2xl font-syne text-[#06111f]">Création de votre espace client</h1>
              <p className="text-sm text-[#06111f] opacity-80">Processus sécurisé</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SignupForm
            token={token}
            email={invitation.email}
            fullName={invitation.full_name ?? ''}
          />
        </CardContent>
      </Card>
    </div>
  )
}
