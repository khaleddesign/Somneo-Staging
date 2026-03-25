"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import dynamic from "next/dynamic";
import ClientList from "@/components/custom/ClientList";
import AppLayout from "@/components/custom/AppLayout";

const InviteForm = dynamic(() => import("@/components/custom/InviteForm"), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-center text-gray-500">Loading form...</div>
  ),
});

export default function ClientsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleInviteSuccess = () => {
    setIsDialogOpen(false);
    // Trigger ClientList refresh by changing the key
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <AppLayout>
      <div className="p-8 space-y-8 bg-[#f0f4f8]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl text-midnight font-display">
              Client Management
            </h1>
            <p className="text-gray-500 mt-2 font-body">
              Manage your clients and send invitations
            </p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-teal hover:bg-teal/90 text-white rounded-xl font-heading"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite new client
          </Button>
        </div>

        {/* Client List Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <ClientList key={`client-list-${refreshTrigger}`} />
        </div>

        {/* Invitation Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-125">
            <DialogHeader>
              <DialogTitle>Invite new client</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <InviteForm onSuccess={handleInviteSuccess} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
