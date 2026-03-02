'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldOff, Mail } from 'lucide-react'

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-[#06111f] flex flex-col items-center justify-center p-6 text-center">
      {/* Logo */}
      <div className="mb-16">
        <h1 className="text-4xl font-bold text-teal-400" style={{ fontFamily: 'Syne, sans-serif' }}>
          SomnoConnect
        </h1>
        <p className="text-[#f0e8d6] opacity-70 text-sm mt-1">by SOMNOVENTIS</p>
      </div>

      {/* Icon */}
      <div className="mb-8 inline-flex p-4 bg-yellow-100/10 rounded-full">
        <ShieldOff className="h-16 w-16 text-yellow-500" style={{ color: '#c8a45a' }} />
      </div>

      {/* Content */}
      <h1 className="text-4xl font-bold text-[#f0e8d6] mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
        Compte suspendu
      </h1>

      <p className="text-gray-300 max-w-md mb-8 leading-relaxed">
        Votre accès a été temporairement suspendu. Contactez SOMNOVENTIS pour plus d&apos;informations.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-sm mb-8">
        <a href="mailto:contact@somnoventis.com">
          <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5">
            <Mail className="h-4 w-4 mr-2" />
            Contacter le support
          </Button>
        </a>
      </div>

      {/* Back Link */}
      <Link href="/" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
        ← Retour à l&apos;accueil
      </Link>
    </div>
  )
}
