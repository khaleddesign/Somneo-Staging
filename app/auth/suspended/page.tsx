export default function SuspendedPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="inline-flex w-16 h-16 bg-red-100 rounded-full items-center justify-center">
            <span className="text-3xl">⛔</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Compte suspendu</h1>
        <p className="text-gray-600 mb-6">
          Votre compte a été suspendu. Nous regrettons ce désagrément.
        </p>
        <p className="text-gray-500 text-sm">
          Pour plus d&apos;informations, veuillez contacter{' '}
          <a href="mailto:contact@somnoventis.com" className="text-blue-600 hover:underline">
            contact@somnoventis.com
          </a>
        </p>
      </div>
    </div>
  )
}
