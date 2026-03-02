'use client'

import AdminLayout from '@/components/custom/AdminLayout'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function AdminSettingsPage() {
  const [platformName, setPlatformName] = useState('SomnoConnect')
  const [supportEmail, setSupportEmail] = useState('contact@somnoventis.com')

  return (
    <AdminLayout>
      <div className="p-2 md:p-4 space-y-6 max-w-3xl">
        <div>
          <h1 className="text-4xl text-midnight">Paramètres plateforme</h1>
          <p className="text-gray-500 font-body">Configuration globale de SomnoConnect</p>
        </div>

        <Card className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="space-y-2">
            <Label className="font-heading text-sm text-gray-700">Nom de la plateforme</Label>
            <Input
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="border-gray-200 focus-visible:border-teal focus-visible:ring-teal/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-heading text-sm text-gray-700">Email support</Label>
            <Input
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="border-gray-200 focus-visible:border-teal focus-visible:ring-teal/20"
            />
          </div>

          <Button className="bg-teal text-white hover:bg-teal/90 w-full md:w-auto">
            Enregistrer les paramètres
          </Button>
        </Card>
      </div>
    </AdminLayout>
  )
}
