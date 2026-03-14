"use client"
import { Study } from '@/hooks/useStudies'
import { FC, useState } from 'react'
import { AlertTriangle, Package, Download, FileText } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const priorityColors = {
  low: 'bg-gray-200 text-gray-700',
  medium: 'bg-blue-200 text-blue-700',
  high: 'bg-red-200 text-red-700',
}
const statusColors = {
  en_attente: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
  en_cours: 'bg-blue-50 text-blue-700 border border-blue-100',
  termine: 'bg-green-50 text-green-700 border border-green-100',
  annule: 'bg-red-200 text-red-800',
}

interface StudyListProps {
  studies: Study[]
  loading: boolean
  error: string | null
  role?: 'agent' | 'client' | 'admin'
  currentUserId?: string | null
  onAssigned?: () => void
}

export const StudyList: FC<StudyListProps> = ({
  studies,
  loading,
  error,
  role = 'client',
  currentUserId = null,
  onAssigned,
}) => {
  const [assigningStudyId, setAssigningStudyId] = useState<string | null>(null)
  
  // États pour l'export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [exportPeriod, setExportPeriod] = useState<"selection" | "month" | "year" | "all" | "custom">("selection")
  // Format HTML5 month type: "YYYY-MM"
  const [customMonth, setCustomMonth] = useState<string>("")

  function isSlaBreached(study: Study) {
    if (study.priority !== 'high' || study.status !== 'en_attente') return false
    const submittedAt = new Date(study.submitted_at).getTime()
    const now = Date.now()
    const twentyFourHoursMs = 24 * 60 * 60 * 1000
    return now - submittedAt > twentyFourHoursMs
  }

  async function handleAssign(studyId: string) {
    setAssigningStudyId(studyId)
    try {
      const res = await fetch(`/api/studies/${studyId}/assign`, { method: 'PATCH' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Unable to take on this study')
      }
      onAssigned?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error lors de l’assignation'
      alert(message)
    } finally {
      setAssigningStudyId(null)
    }
  }

  // Fonctions de sélection
  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(studies.map(s => s.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  function handleSelect(id: string, checked: boolean) {
    const newSet = new Set(selectedIds)
    if (checked) newSet.add(id)
    else newSet.delete(id)
    setSelectedIds(newSet)
  }

  // Fonction utilitaire pour préparer les données d'export
  function getExportData() {
    let toExport = studies
    const now = new Date()
    
    if (exportPeriod === 'selection') {
      toExport = studies.filter(s => selectedIds.has(s.id))
      if (toExport.length === 0) {
        alert("Veuillez sélectionner au moins une étude.")
        return null
      }
    } else if (exportPeriod === 'month') {
      toExport = studies.filter(s => {
        const d = new Date(s.submitted_at)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
    } else if (exportPeriod === 'custom') {
      if (!customMonth) {
         alert("Veuillez choisir un mois.")
         return null
      }
      const [yearStr, monthStr] = customMonth.split('-')
      const targetYear = parseInt(yearStr, 10)
      const targetMonth = parseInt(monthStr, 10) - 1 // JS months are 0-indexed
      toExport = studies.filter(s => {
        const d = new Date(s.submitted_at)
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear
      })
    } else if (exportPeriod === 'year') {
      toExport = studies.filter(s => new Date(s.submitted_at).getFullYear() === now.getFullYear())
    }

    if (toExport.length === 0) {
      alert("Aucune étude à exporter pour cette période.")
      return null
    }
    return toExport
  }

  // Export CSV
  function handleExportCSV() {
    const toExport = getExportData()
    if (!toExport) return

    const headers = ['Patient ID', 'Type', 'Priorite', 'Status', 'Submission Date']
    const csvContent = [
      headers.join(','),
      ...toExport.map(s => [
        s.patient_reference,
        s.study_type,
        s.priority,
        s.status,
        new Date(s.submitted_at).toLocaleDateString('en-GB')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `export_etudes_${exportPeriod}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export PDF
  function handleExportPDF() {
    const toExport = getExportData()
    if (!toExport) return

    const doc = new jsPDF()
    const title = exportPeriod === 'custom' && customMonth 
                  ? `Study Reports - ${customMonth}` 
                  : `Study Reports (${exportPeriod})`
    
    doc.setFontSize(18)
    doc.text(title, 14, 22)
    doc.setFontSize(11)
    doc.text(`Généré le: ${new Date().toLocaleDateString('en-GB')}`, 14, 30)

    const tableColumn = ["Patient ID", "Type", "Priority", "Status", "Submission Date"]
    const tableRows = toExport.map(s => [
      s.patient_reference,
      s.study_type,
      s.priority || 'N/A',
      s.status.replace('_', ' '),
      new Date(s.submitted_at).toLocaleDateString('en-GB')
    ])

    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [4, 153, 150] } // Teal color from SomnoConnect theme
    })

    doc.save(`export_etudes_${exportPeriod}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }
  if (error) {
    return <div className="text-red-600">Error : {error}</div>
  }
  if (!studies.length) {
    return <div className="text-center text-gray-500 py-8">Aucune étude pour le moment</div>
  }

  return (
    <div className="space-y-4">
      {/* Barre d'outils d'export */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-3">
          <select 
            className="text-sm border-gray-300 rounded-lg font-body focus:ring-teal focus:border-teal p-2 border"
            value={exportPeriod}
            onChange={(e) => setExportPeriod(e.target.value as 'selection' | 'month' | 'year' | 'all' | 'custom')}
          >
            <option value="selection">Exporter la sélection ({selectedIds.size})</option>
            <option value="month">Ce mois-ci</option>
            <option value="custom">Un mois spécifique...</option>
            <option value="year">Cette année</option>
            <option value="all">All studies</option>
          </select>

          {exportPeriod === 'custom' && (
            <input 
              type="month" 
              className="text-sm border-gray-300 rounded-lg font-body focus:ring-teal focus:border-teal p-1.5 border"
              value={customMonth}
              onChange={(e) => setCustomMonth(e.target.value)}
            />
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="font-heading gap-2">
              <Download className="w-4 h-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="font-heading gap-2">
              <FileText className="w-4 h-4 text-red-500" />
              PDF
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-500 font-body">
          {studies.length} étude(s) au total
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-100 text-sm bg-white rounded-2xl overflow-hidden shadow-sm">
          <thead>
            <tr className="bg-[#fafbfc] border-b border-gray-100">
              <th className="px-3 py-3 text-left w-12 text-center">
                <Checkbox 
                  checked={studies.length > 0 && selectedIds.size === studies.length}
                  onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  aria-label="Sélectionner tout"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">Patient ID</th>
              <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">Type</th>
              <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">Priority</th>
              <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">Status</th>
              <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">Date de soumission</th>
              <th className="px-3 py-3 text-center text-xs text-gray-400 uppercase tracking-wider font-heading">Archive</th>
              <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">Actions</th>
            </tr>
          </thead>
          <tbody>
            {studies.map((study) => (
              <tr key={study.id} className="border-b border-gray-100 hover:bg-teal/3 transition-colors">
                <td className="px-3 py-3 text-center">
                  <Checkbox 
                    checked={selectedIds.has(study.id)}
                    onCheckedChange={(checked) => handleSelect(study.id, checked as boolean)}
                    aria-label={`Sélectionner étude ${study.patient_reference}`}
                  />
                </td>
                <td className="px-3 py-3 font-body text-sm text-midnight">{study.patient_reference}</td>
                <td className="px-3 py-3 font-body text-sm text-midnight">{study.study_type}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${priorityColors[study.priority]}`}>{study.priority}</span>
                    {isSlaBreached(study) && (
                      <span
                        title="SLA dépassé"
                        className="inline-flex items-center gap-1 text-xs text-red-600 font-medium animate-pulse"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        SLA dépassé
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[study.status]}`}>{study.status.replace('_', ' ')}</span>
                </td>
                <td className="px-3 py-3 font-body text-sm text-midnight">{new Date(study.submitted_at).toLocaleDateString('en-GB')}</td>
                <td className="px-3 py-3 text-center">
                  {study.archived_at ? (
                    <span title={`Archivé le ${new Date(study.archived_at).toLocaleDateString('en-GB')}`}>
                      <Package className="h-5 w-5 text-gray-500 inline" />
                    </span>
                  ) : (
                    ''
                  )}
                </td>
                <td className="px-3 py-3">
                  {role === 'agent' ? (
                    !study.assigned_agent_id ? (
                      <button
                        type="button"
                        onClick={() => handleAssign(study.id)}
                        disabled={assigningStudyId === study.id}
                        className="bg-teal text-white text-sm px-3 py-1 rounded-lg hover:bg-teal/90 disabled:opacity-60"
                      >
                        {assigningStudyId === study.id ? 'Assignation...' : 'Prendre en charge'}
                      </button>
                    ) : study.assigned_agent_id === currentUserId ? (
                      <a
                        href={`/dashboard/agent/studies/${study.id}`}
                        className="border border-teal text-teal text-sm px-3 py-1 rounded-lg hover:bg-teal/5"
                      >
                        Voir
                      </a>
                    ) : null
                  ) : role === 'client' ? (
                    <a
                      href={`/dashboard/client/studies/${study.id}`}
                      className="px-2 py-1 bg-gray-200 rounded text-xs text-gray-700 hover:bg-gray-300"
                    >
                      Voir
                    </a>
                  ) : role === 'admin' ? (
                    <a
                      href={`/dashboard/admin/studies/${study.id}`}
                      className="border border-teal text-teal text-sm px-3 py-1 rounded-lg hover:bg-teal/5"
                    >
                      Voir
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
