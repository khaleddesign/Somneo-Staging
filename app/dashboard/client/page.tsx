import UploadStudy from '@/components/custom/UploadStudy'

export default function ClientDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Mon espace client</h1>
      <UploadStudy />
    </div>
  )
}
