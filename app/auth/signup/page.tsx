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
      <div className="min-h-screen flex flex-col lg:flex-row">
        <AuthLeftPanel />
        <div className="w-full lg:basis-3/5 flex items-center justify-center bg-sand p-8 lg:p-12">
          <div className="w-full max-w-md">
            <h1 className="text-4xl lg:text-5xl text-red-600 mb-2 leading-tight">
              Lien invalide
            </h1>
            <p className="text-gray-500 font-body">Token manquant dans l&apos;URL.</p>
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
      <div className="min-h-screen flex flex-col lg:flex-row">
        <AuthLeftPanel />
        <div className="w-full lg:basis-3/5 flex items-center justify-center bg-sand p-8 lg:p-12">
          <div className="w-full max-w-md">
            <h1 className="text-4xl lg:text-5xl text-red-600 mb-2 leading-tight">
              Erreur
            </h1>
            <p className="text-gray-500 font-body">{errorMsg}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        <AuthLeftPanel />
        <div className="w-full lg:basis-3/5 flex items-center justify-center bg-sand p-8 lg:p-12">
          <div className="w-full max-w-md">
            <h1 className="text-4xl lg:text-5xl text-red-600 mb-2 leading-tight">
              Invitation expirée
            </h1>
            <p className="text-gray-500 font-body">Ce lien est invalide ou déjà utilisé.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthLeftPanel />
      <div className="w-full lg:basis-3/5 flex items-center justify-center bg-sand p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-4xl lg:text-5xl text-midnight mb-2 leading-tight">
              Créer votre compte
            </h1>
            <p className="text-gray-500 font-body">Invitation requise pour accéder à la plateforme</p>
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
