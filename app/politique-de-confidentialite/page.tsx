import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | SomnoConnect',
}

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-display text-midnight mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-gray-600 font-body">
          <p className="lead">
            The protection of your personal data and especially health data
            (PHI) is at the heart of our priorities.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">1. Data Collected</h2>
            <p>We collect and process the following data:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Professional identification data (name, email, role, institution).</li>
              <li>Polysomnography and polygraphy study records.</li>
              <li>Pseudonymized patient references (encrypted at rest with AES-256).</li>
              <li>Final analysis reports (signed PDFs).</li>
              <li>Access and action logs (Audit trails).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">2. Purpose of Processing</h2>
            <p>
              These data are necessary to provide our B2B sleep analysis service. 
              They allow for secure exchange between prescribers and analysts, 
              as well as billing for the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">3. Security and Hosting</h2>
            <p>
              All data are encrypted in transit (TLS/HTTPS) and at rest. 
              Sensitive patient references are encrypted at the application level 
              before insertion into the database. 
            </p>
            <p className="mt-2">
              Access to studies is strictly compartmentalized by institution and by 
              specific access rights via RLS (Row Level Security) policies verified on the server-side.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">4. Data Retention</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Source EDF files are kept for analysis and will be <strong>permanently deleted 72 hours</strong> after the study is closed.</li>
              <li>PDF analysis reports are kept indefinitely at the prescriber's disposal.</li>
              <li>Account data can be deleted upon simple administrative request.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">5. Your Rights (GDPR)</h2>
            <p>
              In accordance with European regulations (GDPR), you have the right 
              of access, rectification, erasure, limitation, and portability of 
              your data. To exercise your rights, contact our DPO at: <a href="mailto:dpo@somnoventis.com" className="text-teal hover:underline">dpo@somnoventis.com</a>.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-100 text-sm text-gray-400">
            Last update: {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>
      </div>
    </div>
  )
}
