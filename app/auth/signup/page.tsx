import { getInvitationByToken } from '@/lib/supabase/invitations'
import SignupForm from '@/components/custom/SignupForm'

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  console.log('[SignUpPage] token reçu:', token)

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600">Lien invalide</h1>
          <p className="text-slate-500 mt-2">Token manquant dans l URL.</p>
        </div>
      </div>
    )
  }

  let invitation = null
  let errorMsg = null

  try {
    invitation = await getInvitationByToken(token)
    console.log('[SignUpPage] invitation trouvée:', invitation)
  } catch (err: any) {
    console.error('[SignUpPage] erreur:', err)
    errorMsg = err?.message ?? 'Erreur inconnue'
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600">Erreur</h1>
          <p className="text-slate-500 mt-2">{errorMsg}</p>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600">Invitation expirée</h1>
          <p className="text-slate-500 mt-2">Ce lien est invalide ou déjà utilisé.</p>
        </div>
      </div>
    )
  }

  return (
    <SignupForm 
      token={token} 
      fullName={invitation.full_name ?? ''} 
    />
  )
}
