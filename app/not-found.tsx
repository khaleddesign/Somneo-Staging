import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center bg-[#f0f4f8] p-4 text-center font-body">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full flex flex-col items-center">
        <div className="h-16 w-16 bg-teal/10 rounded-full flex items-center justify-center mb-6">
          <FileQuestion className="h-8 w-8 text-teal" />
        </div>
        
        <h2 className="text-2xl font-display text-midnight mb-3">Page Introuvable</h2>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          The page or resource you are looking for does not exist or has been moved. Check the URL or return to the home page.
        </p>
        
        <Link 
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 py-3 font-heading text-white hover:bg-teal/90 transition-all active:scale-95 shadow-sm"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
