'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserPlus } from 'lucide-react'
import dynamic from 'next/dynamic'
import ClientList from '@/components/custom/ClientList'
import AppLayout from '@/components/custom/AppLayout'

const InviteForm = dynamic(() => import('@/components/custom/InviteForm'), {
  ssr: false,
  loading: () => <div className="p-4 text-center text-gray-500">Chargement du formulaire...</div>,
})

export default function ClientsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleInviteSuccess = () => {
    setIsDialogOpen(false)
    // Trigger ClientList refresh by changing the key
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <AppLayout>
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Syne, sans-serif' }}>
            Gestion des Clients
          </h1>
          <p className="text-gray-600 mt-2">Gérez vos clients et envoyez des invitations</p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Inviter un nouveau client
        </Button>
      </div>

      {/* Client List Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <ClientList key={`client-list-${refreshTrigger}`} />
      </div>

      {/* Invitation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Inviter un nouveau client</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <InviteForm onSuccess={handleInviteSuccess} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </AppLayout>
  )
}
