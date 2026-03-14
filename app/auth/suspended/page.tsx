'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldOff, Mail } from 'lucide-react'
import AuthLeftPanel from '@/components/custom/AuthLeftPanel'

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AuthLeftPanel />

      <div className="w-full lg:basis-[55%] flex items-center justify-center bg-white p-8 lg:p-12">
        <div className="w-full max-w-xl text-center bg-white border border-gray-100 rounded-2xl shadow-sm p-8 lg:p-10">
          <div className="mb-6 inline-flex p-4 bg-gold/10 rounded-full">
            <ShieldOff className="h-16 w-16 text-gold" />
          </div>

          <h1 className="text-4xl lg:text-5xl text-midnight mb-4 font-display">
            Compte suspendu
          </h1>

          <p className="text-gray-600 mb-8 leading-relaxed font-body">
            Your access has been temporarily suspended. Please contact SOMNOVENTIS for more information.
          </p>

          <div className="flex flex-col gap-3 w-full max-w-sm mx-auto mb-6">
            <a href="mailto:contact@somnoventis.com">
              <Button className="w-full bg-teal hover:bg-teal/90 text-white font-semibold py-2.5">
                <Mail className="h-4 w-4 mr-2" />
                Contact support
              </Button>
            </a>
          </div>

          <Link href="/" className="text-teal hover:text-teal/80 font-medium transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
