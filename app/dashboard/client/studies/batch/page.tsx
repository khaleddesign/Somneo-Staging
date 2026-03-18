import AppLayout from '@/components/custom/AppLayout'
import { BatchEDFUpload } from '@/components/custom/BatchEDFUpload'

export default function BatchEDFPage() {
  return (
    <AppLayout>
      <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl text-midnight font-display">Soumettre plusieurs études</h1>
          <p className="text-gray-500 mt-1 font-body text-sm">
            Uploadez jusqu&apos;à 20 fichiers EDF en une seule session.
            Chaque fichier génère une étude indépendante.
          </p>
        </div>

        <BatchEDFUpload />
      </div>
    </AppLayout>
  )
}
