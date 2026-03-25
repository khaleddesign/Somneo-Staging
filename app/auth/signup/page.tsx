import { getInvitationByToken } from "@/lib/supabase/invitations";
import SignupForm from "@/components/custom/SignupForm";
import AuthLeftPanel from "@/components/custom/AuthLeftPanel";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        <AuthLeftPanel />
        <div className="w-full lg:basis-[55%] flex items-center justify-center bg-white p-8 lg:p-12">
          <div className="w-full max-w-md">
            <h1 className="text-5xl text-red-600 mb-2 leading-tight font-display">
              Lien invalide
            </h1>
            <p className="text-gray-500 font-body">
              Token manquant dans l&apos;URL.
            </p>
          </div>
        </div>
      </div>
    );
  }

  let invitation = null;
  let errorMsg = null;

  try {
    invitation = await getInvitationByToken(token);
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Unknown error";
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        <AuthLeftPanel />
        <div className="w-full lg:basis-[55%] flex items-center justify-center bg-white p-8 lg:p-12">
          <div className="w-full max-w-md">
            <h1 className="text-5xl text-red-600 mb-2 leading-tight font-display">
              Error
            </h1>
            <p className="text-gray-500 font-body">{errorMsg}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        <AuthLeftPanel />
        <div className="w-full lg:basis-[55%] flex items-center justify-center bg-white p-8 lg:p-12">
          <div className="w-full max-w-md">
            <h1 className="text-5xl text-red-600 mb-2 leading-tight font-display">
              Invitation expired
            </h1>
            <p className="text-gray-500 font-body">
              This link is invalid or has already been used.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthLeftPanel />
      <div className="w-full lg:basis-[55%] flex items-center justify-center bg-white p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-5xl text-midnight mb-2 leading-tight font-display">
              Create your account
            </h1>
            <p className="text-gray-500 font-body">
              An invitation is required to access the platform
            </p>
          </div>
          <SignupForm
            token={token}
            email={invitation.email}
            fullName={invitation.full_name ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
