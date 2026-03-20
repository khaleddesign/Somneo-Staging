"use client"
import { Study } from '@/hooks/useStudies'
import { FC, useState } from 'react'
import { AlertTriangle, Package, Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { AssignReportPopover } from '@/components/custom/AssignReportPopover'
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
  showOwner?: boolean
}

export const StudyList: FC<StudyListProps> = ({
  studies,
  loading,
  error,
  role = 'client',
  currentUserId = null,
  onAssigned,
  showOwner,
}) => {
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
        toast.error("Please select at least one study.")
        return null
      }
    } else if (exportPeriod === 'month') {
      toExport = studies.filter(s => {
        const d = new Date(s.submitted_at)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
    } else if (exportPeriod === 'custom') {
      if (!customMonth) {
         toast.error("Please select a month.")
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
      toast.error("No studies to export for this period.")
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

    // Configuration des couleurs et dimensions
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const brandTeal: [number, number, number] = [4, 153, 150]
    const brandMidnight: [number, number, number] = [26, 32, 44]
    const lightGray: [number, number, number] = [240, 244, 248]

    // 1. BANDEAU D'EN-TÊTE (Header Banner)
    doc.setFillColor(...brandMidnight)
    doc.rect(0, 0, pageWidth, 40, 'F')

    // Logo SomnoConnect
    doc.setFont("helvetica", "bold")
    doc.setFontSize(26)
    doc.setTextColor(255, 255, 255)
    doc.text("Somno", 14, 26)
    doc.setTextColor(...brandTeal)
    doc.text("Connect", 47, 26)

    // Titre de l'export à droite
    const title = exportPeriod === 'custom' && customMonth
                  ? `Studies Report - ${customMonth}`
                  : `Studies Report (${exportPeriod.toUpperCase()})`
    
    doc.setFont("helvetica", "normal")
    doc.setFontSize(14)
    doc.setTextColor(255, 255, 255)
    doc.text(title, pageWidth - 14, 20, { align: 'right' })

    // Date de génération
    doc.setFontSize(10)
    doc.setTextColor(180, 190, 200)
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 14, 28, { align: 'right' })

    // 2. ENCARTS DE RÉSUMÉ (KPI stat boxes)
    const statsY = 48
    
    // Box 1: Total
    doc.setFillColor(...lightGray)
    doc.roundedRect(14, statsY, 55, 22, 2, 2, 'F')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text("TOTAL STUDIES", 20, statsY + 8)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(...brandMidnight)
    doc.text(String(toExport.length), 20, statsY + 18)

    // Box 2: Haute Priorité
    const highPriorityCount = toExport.filter(s => s.priority === 'high').length
    doc.setFillColor(...lightGray)
    doc.roundedRect(75, statsY, 55, 22, 2, 2, 'F')
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text("HIGH PRIORITY", 81, statsY + 8)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(220, 38, 38) // Red
    doc.text(String(highPriorityCount), 81, statsY + 18)

    // Box 3: Terminées
    const completedCount = toExport.filter(s => s.status === 'termine').length
    doc.setFillColor(...lightGray)
    doc.roundedRect(136, statsY, 55, 22, 2, 2, 'F')
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text("COMPLETED", 142, statsY + 8)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(22, 163, 74) // Green
    doc.text(String(completedCount), 142, statsY + 18)

    // 3. TABLEAU (Styled clean autoTable)
    const tableColumn = ["Patient ID", "Type", "Priority", "Status", "Submission"]
    const tableRows = toExport.map(s => [
      s.patient_reference,
      s.study_type,
      s.priority ? s.priority.toUpperCase() : 'N/A',
      s.status.replace('_', ' ').toUpperCase(),
      new Date(s.submitted_at).toLocaleDateString('en-GB')
    ])

    autoTable(doc, {
      startY: statsY + 30, // Starts below the stat boxes
      head: [tableColumn],
      body: tableRows,
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: { top: 6, bottom: 6, left: 4, right: 4 },
        textColor: [60, 60, 60],
      },
      headStyles: {
        fillColor: [248, 250, 252], // bg-slate-50
        textColor: brandMidnight,
        fontStyle: 'bold',
        lineWidth: { bottom: 0.5 },
        lineColor: [200, 210, 220], // subtle bottom border for header
      },
      bodyStyles: {
        lineWidth: { bottom: 0.1 },
        lineColor: [230, 235, 240], // subtle row dividers
      },
      alternateRowStyles: {
        fillColor: [252, 253, 255], 
      },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: brandMidnight }, // Patient ID darker
        4: { halign: 'right' } // Date
      },
      
      // 4. PIED DE PAGE (Footer) avec mentions et pagination
      didDrawPage: function (data) {
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(150, 150, 150)
        
        // Ligne de séparation
        doc.setDrawColor(240, 240, 240)
        doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16)

        // Mentions légales à gauche
        doc.text("CONFIDENTIAL DOCUMENT - Protected medical data (HDS/GDPR).", 14, pageHeight - 10)
        
        // Numéro de page à droite
        const pageNumberStr = `Page ${data.pageNumber}`
        doc.text(pageNumberStr, pageWidth - 14, pageHeight - 10, { align: 'right' })
      }
    })

    doc.save(`SomnoConnect_Report_${exportPeriod}_${new Date().toISOString().split('T')[0]}.pdf`)
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
    return <div className="text-center text-gray-500 py-8">No studies yet</div>
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
            <option value="selection">Export selection ({selectedIds.size})</option>
            <option value="month">This month</option>
            <option value="custom">A specific month...</option>
            <option value="year">This year</option>
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
          {studies.length} study(ies) total
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
                  aria-label="Select all"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">Patient ID</th>
              {showOwner && (
                <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">
                  Submitted by
                </th>
              )}
              <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">Type</th>
              <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">Priority</th>
              <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">Status</th>
              {(role === 'agent' || role === 'admin') && (
                <>
                  {!showOwner && <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">Client</th>}
                  <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">Result date</th>
                  <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">Delay (d)</th>
                </>
              )}
              <th className="px-3 py-3 text-left text-xs text-gray-400 uppercase tracking-wider font-heading">Submission date</th>
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
                    aria-label={`Select study ${study.patient_reference}`}
                  />
                </td>
                <td className="px-3 py-3 font-body text-sm text-midnight">{study.patient_reference}</td>
                {showOwner && (
                  <td className="px-3 py-3 font-body text-sm text-gray-600">
                    {study.client_name ?? '—'}
                  </td>
                )}
                <td className="px-3 py-3 font-body text-sm text-midnight">{study.study_type}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${priorityColors[study.priority]}`}>{study.priority}</span>
                    {isSlaBreached(study) && (
                      <span
                        title="SLA breached"
                        className="inline-flex items-center gap-1 text-xs text-red-600 font-medium animate-pulse"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        SLA breached
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[study.status]}`}>{study.status.replace('_', ' ')}</span>
                    {study.is_stale && (
                      <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium animate-pulse">
                        ⚠ Delayed
                      </span>
                    )}
                  </div>
                </td>
                {(role === 'agent' || role === 'admin') && (
                  <>
                    {!showOwner && (
                      <td className="px-3 py-3 font-body text-sm text-gray-600">
                        {study.client_name ?? '—'}
                      </td>
                    )}
                    <td className="px-3 py-3 font-body text-sm text-gray-600">
                      {study.result_date
                        ? new Date(study.result_date).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td className="px-3 py-3 font-body text-sm">
                      {study.delay_days != null ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          study.delay_days > 10
                            ? 'bg-red-100 text-red-700'
                            : study.delay_days > 5
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {study.delay_days}j
                        </span>
                      ) : '—'}
                    </td>
                  </>
                )}
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
                    (study.status === 'en_attente' || study.status === 'en_cours') ? (
                      <AssignReportPopover
                        studyId={study.id}
                        studyPatientRef={study.patient_reference}
                        onSuccess={() => onAssigned?.()}
                      />
                    ) : null
                  ) : role === 'client' ? (
                    <a
                      href={`/dashboard/client/studies/${study.id}`}
                      className="px-2 py-1 bg-gray-200 rounded text-xs text-gray-700 hover:bg-gray-300"
                    >
                      View
                    </a>
                  ) : role === 'admin' ? (
                    <a
                      href={`/dashboard/admin/studies/${study.id}`}
                      className="border border-teal text-teal text-sm px-3 py-1 rounded-lg hover:bg-teal/5"
                    >
                      View
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
