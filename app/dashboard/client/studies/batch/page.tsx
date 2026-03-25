import AppLayout from "@/components/custom/AppLayout";
import { BatchEDFUpload } from "@/components/custom/BatchEDFUpload";

export default function BatchEDFPage() {
  return (
    <AppLayout>
      <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl text-midnight font-display">
            Submit multiple studies
          </h1>
          <p className="text-gray-500 mt-1 font-body text-sm">
            Upload up to 20 EDF files in a single session. Each file creates an
            independent study.
          </p>
        </div>

        <BatchEDFUpload />
      </div>
    </AppLayout>
  );
}
