'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '@/components/custom/AdminLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type StudyType = 'PSG' | 'PV' | 'MSLT' | 'MWT'

interface PricingRow {
  study_type: StudyType
  price_ht: number
  currency: string
}

const descriptions: Record<StudyType, string> = {
  PSG: 'Full polysomnography',
  PV: 'Polygraphie ventilatoire',
  MSLT: 'Test de latence d\'endormissement',
  MWT: 'Maintenance of Wakefulness Test',
}

const orderedTypes: StudyType[] = ['PSG', 'PV', 'MSLT', 'MWT']

export default function AdminPricingSettingsPage() {
  const [rows, setRows] = useState<PricingRow[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/invoices/settings')
      const data = await res.json()
      const map = new Map<string, PricingRow>()
      ;((data.settings || []) as PricingRow[]).forEach((row) => {
        map.set(row.study_type, row)
      })

      const normalized = orderedTypes.map((type) => {
        const hit = map.get(type)
        return {
          study_type: type,
          price_ht: Number(hit?.price_ht ?? 0),
          currency: hit?.currency || 'EUR',
        }
      })

      setRows(normalized)
    }

    load()
  }, [])

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.price_ht || 0), 0),
    [rows],
  )

  function updatePrice(studyType: StudyType, value: string) {
    const numeric = Number(value)
    setRows((current) =>
      current.map((row) =>
        row.study_type === studyType
          ? { ...row, price_ht: Number.isFinite(numeric) ? numeric : 0 }
          : row,
      ),
    )
  }

  async function save() {
    setSaving(true)
    const payload = {
      prices: rows.map((row) => ({ study_type: row.study_type, price_ht: Number(row.price_ht || 0) })),
    }

    const res = await fetch('/api/invoices/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error || 'Error saving')
      return
    }

    toast.success('Prices updated')
  }

  return (
    <AdminLayout>
      <div className="p-2 md:p-4 space-y-6 bg-[#f0f4f8]">
        <div>
          <h1 className="text-4xl text-midnight font-display">Tarification</h1>
          <p className="text-gray-500 font-body">Pre-tax price per study type</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#fafbfc] border-b border-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Type</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Description</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Prix HT</th>
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-heading">Devise</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.study_type} className="border-t border-gray-100">
                  <td className="px-3 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-heading bg-teal/10 text-teal border border-teal/20">
                      {row.study_type}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-body text-midnight">{descriptions[row.study_type]}</td>
                  <td className="px-3 py-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={row.price_ht}
                      onChange={(e) => updatePrice(row.study_type, e.target.value)}
                      className="max-w-40 bg-[#f8fafc] border-2 border-transparent rounded-xl focus-visible:border-teal focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-teal/6"
                    />
                  </td>
                  <td className="px-3 py-3 font-body text-midnight">EUR</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500 font-body">Total indicatif: {total.toFixed(2)} EUR</p>
            <Button
              className="bg-teal text-white hover:bg-teal/90 rounded-xl font-heading"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
