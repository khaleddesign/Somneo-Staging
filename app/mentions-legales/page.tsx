import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Legal Notice | SomnoConnect',
}

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-display text-midnight mb-8">Legal Notice</h1>
        
        <div className="space-y-6 text-gray-600 font-body">
          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">1. Publisher</h2>
            <p><strong>SomnoConnect</strong></p>
            <p>SAS with capital of 10,000€</p>
            <p>RCS Paris B 123 456 789</p>
            <p>Head Office: 123 avenue de la République, 75011 Paris, France</p>
            <p>Email: contact@somnoventis.com</p>
            <p>Publication Director: Khaled Ouertani</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">2. Hosting and Health Data</h2>
            <p>The application is hosted on the Vercel serverless infrastructure (European Union).</p>
            <p>
              Database and file storage are operated by <strong>Supabase</strong> 
              on AWS servers in Europe (Frankfurt, Germany / eu-central-1), 
              complying with strict security and confidentiality standards.
            </p>
            <p>
              Personal data and patient records are hosted in accordance 
              with applicable Healthcare Data Hosting (HDS) guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">3. Intellectual Property</h2>
            <p>
              The site, the "SomnoConnect" brand, as well as all of its content 
              (texts, images, logos, architecture, code) are protected by intellectual 
              property law. Any reproduction is strictly prohibited without written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-midnight mb-3">4. Limitation of Liability</h2>
            <p>
              The publisher strives to ensure the accuracy and update of the information 
              published on this site, and reserves the right to correct the content.
              However, SomnoConnect cannot be held liable for temporary unavailability 
              of the platform or data losses caused by force majeure events.
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
