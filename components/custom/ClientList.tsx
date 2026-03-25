"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Loader2, Ban, CheckCircle } from "lucide-react";

interface Client {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  is_suspended: boolean;
}

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchClients() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error loading data");
      }
      const data = await res.json();
      setClients(data.clients || []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClients();
  }, []);

  async function handleToggleSuspend(
    clientId: string,
    currentSuspended: boolean,
  ) {
    const action = currentSuspended ? "reactivate" : "suspend";
    if (!window.confirm(`Are you sure de vouloir ${action} ce client ?`)) {
      return;
    }

    setActionLoading(clientId);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: clientId,
          is_suspended: !currentSuspended,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error updating profile");
      }

      await fetchClients();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading des clients...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded border border-red-200 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium mb-2">Aucun client pour le moment</p>
        <p className="text-sm">Invitez votre premier client pour commencer</p>
      </div>
    );
  }

  return (
    <Table className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
      <TableHeader>
        <TableRow className="bg-[#fafbfc] border-b border-gray-100">
          <TableHead className="text-xs uppercase tracking-wider text-gray-400 font-heading">
            Nom
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-gray-400 font-heading">
            Email
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-gray-400 font-heading">
            Inscription
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-gray-400 font-heading">
            Status
          </TableHead>
          <TableHead className="text-right text-xs uppercase tracking-wider text-gray-400 font-heading">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow
            key={client.id}
            className="hover:bg-teal/3 transition-colors"
          >
            <TableCell className="font-medium">{client.full_name}</TableCell>
            <TableCell className="text-gray-600">{client.email}</TableCell>
            <TableCell>
              {new Date(client.created_at).toLocaleDateString("en-GB")}
            </TableCell>
            <TableCell>
              {client.is_suspended ? (
                <Badge variant="destructive">Suspendu</Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-800 border-green-200"
                >
                  Actif
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button
                onClick={() =>
                  handleToggleSuspend(client.id, client.is_suspended)
                }
                disabled={actionLoading === client.id}
                size="sm"
                variant="ghost"
              >
                {actionLoading === client.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : client.is_suspended ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" /> Reactivate
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4 mr-1" /> Suspend
                  </>
                )}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
