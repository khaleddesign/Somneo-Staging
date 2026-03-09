'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AdminLayout from '@/components/custom/AdminLayout'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download } from 'lucide-react'

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled'

interface InvoiceClient {
  full_name: string | null
  email: string | null
}

interface InvoiceRow {
  id: string
  invoice_number: string
  mode: 'per_study' | 'monthly'
  billing_month: string | null
  total_ttc: number
  status: InvoiceStatus
  created_at: string
  client: InvoiceClient | null
}

function modeLabel(mode: InvoiceRow['mode']) {
  return mode === 'monthly' ? 'Mensuel' : 'Par étude'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR')
}

function statusUi(status: InvoiceStatus) {
  if (status === 'draft') return 'bg-gray-100 text-gray-700 border border-gray-200'
  if (status === 'sent') return 'bg-blue-100 text-blue-700 border border-blue-200'
  if (status === 'paid') return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  return 'bg-red-100 text-red-700 border border-red-200'
}

function statusLabel(status: InvoiceStatus) {
  if (status === 'draft') return 'Brouillon'
  if (status === 'sent') return 'Envoyée'
  if (status === 'paid') return 'Payée'
  return 'Annulée'
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  async function fetchInvoices() {
    setLoading(true)
    const res = await fetch('/api/invoices')
    const data = await res.json()
    setInvoices(data.invoices || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  const sortedInvoices = useMemo(
    () => [...invoices].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [invoices],
  )

  async function updateStatus(invoiceId: string, status: Exclude<InvoiceStatus, 'draft'>) {
    setUpdatingId(invoiceId)
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })

    if (res.ok) {
      setInvoices((current) =>
        current.map((invoice) =>
          invoice.id === invoiceId ? { ...invoice, status } : invoice,
        ),
      )
    }
    setUpdatingId(null)
  }

  async function downloadPdf(invoiceId: string) {
    setDownloadingId(invoiceId)
    const res = await fetch(`/api/invoices/${invoiceId}/download`)
    const data = await res.json().catch(() => null)

    if (res.ok && data?.url) {
      window.open(data.url, '_blank', 'noopener,noreferrer')
    }

    setDownloadingId(null)
  }

  return (
    <AdminLayout>
      <div className="p-2 md:p-4 space-y-6 bg-[#f0f4f8]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl text-midnight font-display">Facturation</h1>
            <p className="text-gray-500 font-body">Gestion des factures clients</p>
          </div>

          <Button asChild className="bg-teal text-white hover:bg-teal/90 rounded-xl font-heading">
            <Link href="/dashboard/admin/invoices/new">Nouvelle facture</Link>
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#fafbfc] border-b border-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">N° Facture</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Client</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Mode</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Période</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Montant TTC</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Statut</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-gray-100 hover:bg-teal/3 transition-colors">
                  <td className="px-3 py-3 font-heading text-midnight">{invoice.invoice_number}</td>
                  <td className="px-3 py-3 font-body text-midnight">{invoice.client?.full_name || '—'}</td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-heading bg-midnight/5 text-midnight border border-midnight/10">
                      {modeLabel(invoice.mode)}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-body text-midnight">
                    {invoice.billing_month || formatDate(invoice.created_at)}
                  </td>
                  <td className="px-3 py-3 font-heading text-gold tabular-nums">
                    {Number(invoice.total_ttc || 0).toFixed(2)} €
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-heading ${statusUi(invoice.status)}`}>
                      {statusLabel(invoice.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void downloadPdf(invoice.id)}
                        disabled={downloadingId === invoice.id}
                        className="border-gray-200"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>

                      <Select
                        value=""
                        onValueChange={(value) => void updateStatus(invoice.id, value as Exclude<InvoiceStatus, 'draft'>)}
                        disabled={updatingId === invoice.id}
                      >
                        <SelectTrigger className="h-8 min-w-40 bg-[#f8fafc] border-2 border-transparent rounded-xl focus:border-teal">
                          <SelectValue placeholder="Changer statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sent">Envoyée</SelectItem>
                          <SelectItem value="paid">Payée</SelectItem>
                          <SelectItem value="cancelled">Annulée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && sortedInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500 font-body">Aucune facture</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
