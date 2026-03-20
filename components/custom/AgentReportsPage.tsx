'use client'

/**
 * AgentReportsPage
 *
 * Page centralisée des rapports pour les agents.
 *
 * Section 1 — Rapports en attente d'assignation (table unassigned_reports)
 * Section 2 — Rapports assignés (études avec report_path NOT NULL)
 */

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StudySearchCombobox } from '@/components/custom/StudySearchCombobox'
import type { StudyMatch } from '@/hooks/useBatchReportUpload'
import {
  ArchiveX, FileText, ExternalLink, RefreshCw, AlertCircle, Loader2, Link2, UploadCloud
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UnassignedReport {
  id: string
  original_filename: string
  file_size: number
  uploaded_at: string
}

interface AssignedStudy {
  id: string
  patient_reference: string
  study_type: string
  client_name: string | null
  updated_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AgentReportsPage() {
  // ── Section 1 — Rapports en attente ──────────────────────────────────────
  const [pending, setPending] = useState<UnassignedReport[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)

  const loadPending = useCallback(async () => {
    setPendingLoading(true)
    setAssignError(null)
    try {
      const res = await fetch('/api/reports/unassigned')
      if (res.ok) {
        const data = await res.json()
        setPending(data.reports ?? [])
      }
    } finally {
      setPendingLoading(false)
    }
  }, [])

  async function assignPending(reportId: string, study: StudyMatch) {
    setAssigningId(reportId)
    setAssignError(null)
    try {
      const res = await fetch(`/api/reports/unassigned/${reportId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ study_id: study.id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Erreur lors de l'assignation")
      }
      // Remove locally + refresh assigned section
      setPending(prev => prev.filter(r => r.id !== reportId))
      loadAssigned()
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setAssigningId(null)
    }
  }

  // ── Section 2 — Rapports assignés ─────────────────────────────────────────
  const [assigned, setAssigned] = useState<AssignedStudy[]>([])
  const [assignedLoading, setAssignedLoading] = useState(true)
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null)

  const loadAssigned = useCallback(async () => {
    setAssignedLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Studies with a report assigned to the current agent
      const { data } = await supabase
        .from('studies')
        .select('id, patient_reference, study_type, updated_at, profiles!studies_client_id_fkey(full_name)')
        .eq('assigned_agent_id', user.id)
        .not('report_path', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(100)

      setAssigned(
        (data ?? []).map((row: {
          id: string
          patient_reference: string
          study_type: string
          updated_at: string
          profiles: { full_name: string | null }[] | { full_name: string | null } | null
        }) => ({
          id: row.id,
          patient_reference: row.patient_reference,
          study_type: row.study_type,
          client_name: Array.isArray(row.profiles)
            ? row.profiles[0]?.full_name ?? null
            : row.profiles?.full_name ?? null,
          updated_at: row.updated_at,
        }))
      )
    } finally {
      setAssignedLoading(false)
    }
  }, [])

  async function openReport(studyId: string) {
    setPdfLoadingId(studyId)
    try {
      const res = await fetch(`/api/studies/${studyId}/report`)
      if (!res.ok) throw new Error('Impossible de charger le rapport')
      const { url } = await res.json()
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // silent — user sees no change, can retry
    } finally {
      setPdfLoadingId(null)
    }
  }

  // Load both sections on mount
  useEffect(() => {
    loadPending()
    loadAssigned()
  }, [loadPending, loadAssigned])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-10">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-midnight font-display">Rapports</h1>
          <p className="text-gray-500 mt-1 font-body text-sm">
            Gérez les rapports en attente et consultez les rapports déjà assignés.
          </p>
        </div>
        <a
          href="/dashboard/agent/studies/batch-reports"
          className="inline-flex items-center gap-2 text-sm border border-teal text-teal px-4 py-2 rounded-lg hover:bg-teal/5 shrink-0"
        >
          <UploadCloud className="h-4 w-4" />
          Upload en masse
        </a>
      </div>

      {/* ── Section 1 — En attente ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArchiveX className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Rapports en attente d&apos;assignation</h2>
            {pending.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs font-heading px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadPending}
            disabled={pendingLoading}
            className="text-xs text-gray-500"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${pendingLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {assignError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            {assignError}
          </div>
        )}

        {pendingLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </div>
        ) : pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <ArchiveX className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">Aucun rapport en attente d&apos;assignation</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-heading text-gray-500 uppercase tracking-wide">Fichier</th>
                  <th className="text-left px-4 py-3 text-xs font-heading text-gray-500 uppercase tracking-wide">Taille</th>
                  <th className="text-left px-4 py-3 text-xs font-heading text-gray-500 uppercase tracking-wide">Uploadé le</th>
                  <th className="text-left px-4 py-3 text-xs font-heading text-gray-500 uppercase tracking-wide w-72">Assigner à</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pending.map(report => (
                  <tr key={report.id} className="bg-white hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                        <span className="truncate max-w-[200px] font-medium text-gray-800">
                          {report.original_filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatFileSize(report.file_size)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(report.uploaded_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <StudySearchCombobox
                            onSelect={study => assignPending(report.id, study)}
                            initialCandidates={[]}
                            disabled={assigningId === report.id}
                          />
                        </div>
                        {assigningId === report.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-teal shrink-0" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Section 2 — Rapports assignés ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">Rapports assignés</h2>
            {assigned.length > 0 && (
              <span className="bg-green-100 text-green-700 text-xs font-heading px-2 py-0.5 rounded-full">
                {assigned.length}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAssigned}
            disabled={assignedLoading}
            className="text-xs text-gray-500"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${assignedLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {assignedLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </div>
        ) : assigned.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">Aucun rapport assigné pour le moment</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-heading text-gray-500 uppercase tracking-wide">Patient ID</th>
                  <th className="text-left px-4 py-3 text-xs font-heading text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-heading text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-heading text-gray-500 uppercase tracking-wide">Date rapport</th>
                  <th className="text-left px-4 py-3 text-xs font-heading text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assigned.map(study => (
                  <tr key={study.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {study.patient_reference}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center text-xs font-heading bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        {study.study_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {study.client_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(study.updated_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-3 border-teal text-teal hover:bg-teal/5"
                        onClick={() => openReport(study.id)}
                        disabled={pdfLoadingId === study.id}
                      >
                        {pdfLoadingId === study.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <><ExternalLink className="h-3 w-3 mr-1" />Voir PDF</>
                        }
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
