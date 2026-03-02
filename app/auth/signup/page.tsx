import { getInvitationByToken } from '@/lib/supabase/invitations'
import SignupForm from '@/components/custom/SignupForm'
import AuthLeftPanel from '@/components/custom/AuthLeftPanel'

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="flex h-screen">
        <AuthLeftPanel />
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-red-600 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              Lien invalide
            </h1>
            <p className="text-gray-600">Token manquant dans l&apos;URL.</p>
          </div>
        </div>
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
      <div className="flex h-screen">
        <AuthLeftPanel />
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-red-600 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              Erreur
            </h1>
            <p className="text-gray-600">{errorMsg}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="flex h-screen">
        <AuthLeftPanel />
        <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-red-600 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              Invitation expirée
            </h1>
            <p className="text-gray-600">Ce lien est invalide ou déjà utilisé.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <AuthLeftPanel />
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              Créer votre compte
            </h1>
            <p className="text-gray-600">Invitation requise pour accéder à la plateforme</p>
          </div>
          <SignupForm
            token={token}
            email={invitation.email}
            fullName={invitation.full_name ?? ''}
          />
        </div>
      </div>
    </div>
  )
}
