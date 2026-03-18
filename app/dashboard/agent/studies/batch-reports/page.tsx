import AppLayout from '@/components/custom/AppLayout'
import { BatchReportUpload } from '@/components/custom/BatchReportUpload'

export default function BatchReportsPage() {
  return (
    <AppLayout>
      <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl text-midnight font-display">Upload de rapports en masse</h1>
          <p className="text-gray-500 mt-1 font-body text-sm">
            Uploadez plusieurs rapports PDF. Le système tente d&apos;associer chaque fichier
            automatiquement à une étude via la référence patient dans le nom du fichier.
          </p>
        </div>

        <BatchReportUpload />
      </div>
    </AppLayout>
  )
}
