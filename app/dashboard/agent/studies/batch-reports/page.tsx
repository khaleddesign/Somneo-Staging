import AppLayout from '@/components/custom/AppLayout'
import { BatchReportUpload } from '@/components/custom/BatchReportUpload'

export default function BatchReportsPage() {
  return (
    <AppLayout>
      <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl text-midnight font-display">Bulk report upload</h1>
          <p className="text-gray-500 mt-1 font-body text-sm">
            Upload multiple PDF reports. The system attempts to match each file
            automatically to a study using the patient reference in the filename.
          </p>
        </div>

        <BatchReportUpload />
      </div>
    </AppLayout>
  )
}
