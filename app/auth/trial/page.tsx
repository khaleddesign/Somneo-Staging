import AuthLeftPanel from '@/components/custom/AuthLeftPanel'
import TrialSignupForm from '@/components/custom/TrialSignupForm'

export default function TrialPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthLeftPanel />

      <div className="w-full lg:basis-[55%] flex items-center justify-center bg-white p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 bg-teal/10 text-teal text-xs font-heading uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
              30-day free trial
            </div>
            <h1 className="text-5xl text-midnight mb-2 leading-tight font-display">
              Get started
            </h1>
            <p className="text-gray-500 font-body">
              Create your clinic account. No credit card required.
            </p>
          </div>

          <TrialSignupForm />
        </div>
      </div>
    </div>
  )
}
