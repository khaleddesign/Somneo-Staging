export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-[#06111f] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#f0e8d6] p-8 rounded-lg">
        <div className="text-center">
          <div className="mb-6 inline-flex w-16 h-16 bg-red-100 rounded-full items-center justify-center mx-auto">
            <span className="text-3xl">⛔</span>
          </div>
          <h1 className="text-2xl font-bold text-[#06111f] mb-3">Compte suspendu</h1>
          <p className="text-[#06111f] mb-6">Votre compte a été suspendu. Nous regrettons ce désagrément.</p>
          <p className="text-[#06111f] text-sm">Pour plus d&apos;informations, veuillez contacter{' '}
            <a href="mailto:contact@somnoventis.com" className="text-[#1ec8d4] hover:underline">contact@somnoventis.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}
