"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { parseTextReport } from '@/lib/reports/parseTextReport'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ReportEditorProps {
  studyId: string
  studyType: 'PSG' | 'PV' | 'MSLT' | 'MWT'
  patientReference: string
  agentName: string
}

type SectionType = 'info' | 'text' | 'metrics' | 'richtext'

interface TemplateField {
  key: string
  label: string
  unit: string
}

interface TemplateSection {
  id: string
  title: string
  type: SectionType
  placeholder?: string
  fields?: TemplateField[]
}

interface ReportTemplate {
  id: string
  name: string
  study_type: ReportEditorProps['studyType']
  sections: TemplateSection[]
}

interface StudyReport {
  id: string
  study_id: string
  content: ReportContent
  status: 'draft' | 'validated'
  updated_at: string
}

interface ReportContent {
  study_type?: string
  sections?: TemplateSection[]
  values: Record<string, Record<string, string>>
}

interface ReportGetResponse {
  report: StudyReport
}

interface ReportCreateResponse {
  report: StudyReport
}

interface TemplateGetResponse {
  template: ReportTemplate
}

interface GeneratePdfResponse {
  success?: boolean
  pdf_url?: string
  error?: string
}

interface AutoDraftResponse {
  success?: boolean
  report?: StudyReport
  error?: string
}

const selectFieldOptions: Record<string, string[]> = {
  snoring: ['Absent', 'Intermittent', 'Continu', 'Positionnel'],
  baseline_stability: ['Stable', 'Instable'],
}

const technicalQuickAdd = [
  'Artefact de mouvement (périodes d\'éveil).',
  'Pression PPC instable (fuites).',
  'Signal EEG bruité (impédances hautes).',
]

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeContent(raw: unknown): ReportContent {
  if (!isObject(raw)) {
    return { values: {} }
  }

  const valuesRaw = raw.values
  const values: Record<string, Record<string, string>> = {}

  if (isObject(valuesRaw)) {
    Object.entries(valuesRaw).forEach(([sectionId, sectionValue]) => {
      if (!isObject(sectionValue)) return

      const normalizedSection: Record<string, string> = {}
      Object.entries(sectionValue).forEach(([fieldKey, fieldValue]) => {
        if (typeof fieldValue === 'string') {
          normalizedSection[fieldKey] = fieldValue
        } else if (typeof fieldValue === 'number') {
          normalizedSection[fieldKey] = String(fieldValue)
        }
      })
      values[sectionId] = normalizedSection
    })
  }

  const sectionsRaw = raw.sections
  const sections = Array.isArray(sectionsRaw)
    ? sectionsRaw.filter(isObject).map((section) => {
        const fieldsRaw = Array.isArray(section.fields)
          ? section.fields.filter(isObject).map((field) => ({
              key: typeof field.key === 'string' ? field.key : '',
              label: typeof field.label === 'string' ? field.label : '',
              unit: typeof field.unit === 'string' ? field.unit : '',
            })).filter((field) => field.key && field.label)
          : undefined

        return {
          id: typeof section.id === 'string' ? section.id : '',
          title: typeof section.title === 'string' ? section.title : '',
          type: (section.type === 'info' || section.type === 'text' || section.type === 'metrics' || section.type === 'richtext')
            ? section.type
            : 'text',
          placeholder: typeof section.placeholder === 'string' ? section.placeholder : undefined,
          fields: fieldsRaw,
        } satisfies TemplateSection
      }).filter((section) => section.id && section.title)
    : undefined

  return {
    study_type: typeof raw.study_type === 'string' ? raw.study_type : undefined,
    sections,
    values,
  }
}

function formatSavedAt(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function ReportEditor({ studyId, studyType, patientReference, agentName }: ReportEditorProps) {
  const [reportId, setReportId] = useState<string | null>(null)
  const [template, setTemplate] = useState<ReportTemplate | null>(null)
  const [content, setContent] = useState<ReportContent>({ values: {} })

  // Ref qui pointe toujours vers le content le plus récent
  // Évite la stale closure dans saveReport (useCallback ne recapture pas content à chaque frappe)
  const contentRef = useRef<ReportContent>({ values: {} })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [generatingDraft, setGeneratingDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [rawInput, setRawInput] = useState('')

  // Toujours synchroniser la ref avec le state courant
  useEffect(() => {
    contentRef.current = content
  }, [content])

  const sectionsToRender = useMemo(() => {
    if (template?.sections?.length) return template.sections
    if (content.sections?.length) return content.sections
    return [] as TemplateSection[]
  }, [template, content.sections])

  const saveReport = useCallback(async () => {
    if (!reportId) return

    // Lire depuis la ref pour toujours avoir le content le plus récent
    // (évite la stale closure : useCallback n'a plus content dans ses deps)
    const currentContent = contentRef.current
    console.log('[saveReport] saving content:', JSON.stringify(currentContent))

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentContent }),
      })

      const payload: unknown = await res.json()
      if (!res.ok) {
        const message = isObject(payload) && typeof payload.error === 'string'
          ? payload.error
          : 'Erreur de sauvegarde'
        throw new Error(message)
      }

      setLastSavedAt(formatSavedAt(new Date()))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de sauvegarde'
      setError(message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [reportId]) // content retiré des deps — on lit depuis contentRef à la place

  const generatePdf = useCallback(async () => {
    if (!reportId) return

    setGeneratingPdf(true)
    setGenerateError(null)

    try {
      await saveReport()

      const res = await fetch(`/api/reports/${reportId}/generate`, {
        method: 'POST',
      })

      const payload = (await res.json()) as GeneratePdfResponse
      if (!res.ok || !payload.pdf_url) {
        throw new Error(payload.error || 'Impossible de générer le PDF')
      }

      setPdfUrl(payload.pdf_url)
      setShowPdfModal(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de génération PDF'
      setGenerateError(message)
    } finally {
      setGeneratingPdf(false)
    }
  }, [reportId, saveReport]) // saveReport stable — reportId suffit en pratique

  const generateAutoDraft = useCallback(async () => {
    if (!reportId) return

    setGeneratingDraft(true)
    setDraftError(null)

    try {
      await saveReport()

      const res = await fetch(`/api/reports/${reportId}/autodraft`, {
        method: 'POST',
      })

      const payload = (await res.json()) as AutoDraftResponse
      if (!res.ok || !payload.report) {
        throw new Error(payload.error || 'Impossible de générer le brouillon médical')
      }

      const normalized = normalizeContent(payload.report.content)
      setContent((prev) => ({
        ...prev,
        ...normalized,
      }))
      setLastSavedAt(formatSavedAt(new Date()))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de génération du brouillon'
      setDraftError(message)
    } finally {
      setGeneratingDraft(false)
    }
  }, [reportId, saveReport])

  useEffect(() => {
    let mounted = true

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const reportRes = await fetch(`/api/reports?study_id=${encodeURIComponent(studyId)}`)

        let currentReport: StudyReport | null = null

        if (reportRes.ok) {
          const payload = (await reportRes.json()) as ReportGetResponse
          currentReport = payload.report
        } else if (reportRes.status === 404) {
          const createRes = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ study_id: studyId }),
          })

          const createPayload: unknown = await createRes.json()
          if (!createRes.ok) {
            const message = isObject(createPayload) && typeof createPayload.error === 'string'
              ? createPayload.error
              : 'Impossible de créer le rapport brouillon'
            throw new Error(message)
          }

          currentReport = (createPayload as ReportCreateResponse).report
        } else {
          const payload: unknown = await reportRes.json()
          const message = isObject(payload) && typeof payload.error === 'string'
            ? payload.error
            : 'Impossible de charger le rapport'
          throw new Error(message)
        }

        const templateRes = await fetch(
          `/api/reports/templates?study_type=${encodeURIComponent(studyType)}`
        )

        const templatePayload: unknown = await templateRes.json()
        if (!templateRes.ok) {
          const message = isObject(templatePayload) && typeof templatePayload.error === 'string'
            ? templatePayload.error
            : 'Impossible de charger le template'
          throw new Error(message)
        }

        const loadedTemplate = (templatePayload as TemplateGetResponse).template
        if (!mounted) return

        setTemplate(loadedTemplate)

        if (currentReport) {
          setReportId(currentReport.id)
          const normalized = normalizeContent(currentReport.content)
          // BUG 2 FIX — initialisation directe sans functional updater
          // Évite que l'état rassis (prev.values = {}) efface les valeurs sauvegardées
          setContent({
            study_type: normalized.study_type,
            values: normalized.values,   // réinjecte les valeurs du rapport existant
            sections: loadedTemplate.sections,
          })
        }
      } catch (err: unknown) {
        if (!mounted) return
        const message = err instanceof Error ? err.message : 'Erreur de chargement'
        setError(message)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      mounted = false
    }
  }, [studyId, studyType])

  useEffect(() => {
    if (!reportId) return

    const intervalId = window.setInterval(() => {
      void saveReport().catch(() => undefined) // autosave silencieux
    }, 30000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [reportId, saveReport])

  function updateValue(sectionId: string, fieldKey: string, nextValue: string) {
    setContent((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        [sectionId]: {
          ...(prev.values[sectionId] ?? {}),
          [fieldKey]: nextValue,
        },
      },
    }))
  }

  function appendTechnicalIncident(text: string) {
    const current = content.values.technical?.text ?? ''
    const separator = current.trim() ? '\n- ' : '- '
    updateValue('technical', 'text', `${current}${separator}${text}`)
  }

  function applyParsedRawText() {
    const parsed = parseTextReport(rawInput)
    if (parsed.length === 0) return

    setContent((prev) => {
      const nextValues: Record<string, Record<string, string>> = { ...prev.values }
      parsed.forEach((item) => {
        nextValues[item.sectionId] = {
          ...(nextValues[item.sectionId] ?? {}),
          [item.key]: item.value,
        }
      })

      return {
        ...prev,
        values: nextValues,
      }
    })
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-100 p-6 text-sm text-gray-500">
        Chargement de l’éditeur de rapport...
      </div>
    )
  }

  return (
    <div className="space-y-6 rounded-xl border border-gray-100 bg-white p-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {generateError && <p className="text-sm text-red-600">{generateError}</p>}
      {draftError && <p className="text-sm text-red-600">{draftError}</p>}

      {sectionsToRender.map((section) => {
        const sectionValues = content.values[section.id] ?? {}

        return (
          <section key={section.id} className="space-y-4">
            <h3 className="border-b border-teal/20 pb-2 font-heading text-midnight">
              {section.title}
            </h3>

            {section.type === 'info' && (
              <div className="grid gap-3 rounded-lg border border-gray-200 p-4 text-sm sm:grid-cols-2">
                <p><span className="font-medium">Patient :</span> {patientReference}</p>
                <p><span className="font-medium">Type d’étude :</span> {studyType}</p>
                <p><span className="font-medium">Date :</span> {new Date().toLocaleDateString('fr-FR')}</p>
                <p><span className="font-medium">Agent :</span> {agentName}</p>
              </div>
            )}

            {section.type === 'text' && (
              <div className="space-y-3">
                <Textarea
                  placeholder={section.placeholder ?? ''}
                  value={sectionValues.text ?? ''}
                  onChange={(e) => updateValue(section.id, 'text', e.target.value)}
                  className="rounded-lg border-gray-200 focus-visible:border-teal"
                />

                {section.id === 'technical' && (
                  <div className="flex flex-wrap gap-2">
                    {technicalQuickAdd.map((incident) => (
                      <Button
                        key={incident}
                        type="button"
                        variant="outline"
                        onClick={() => appendTechnicalIncident(incident)}
                        className="border-gray-200"
                      >
                        {incident}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section.type === 'metrics' && (
              <div className="grid gap-4 sm:grid-cols-2">
                {(section.fields ?? []).map((field) => (
                  <label key={field.key} className="space-y-1">
                    <span className="text-sm text-midnight">
                      {field.label}{field.unit ? ` (${field.unit})` : ''}
                    </span>
                    {selectFieldOptions[field.key] ? (
                      <select
                        value={sectionValues[field.key] ?? ''}
                        onChange={(e) => updateValue(section.id, field.key, e.target.value)}
                        className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-teal"
                      >
                        <option value="">Sélectionner</option>
                        {selectFieldOptions[field.key].map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={sectionValues[field.key] ?? ''}
                        onChange={(e) => updateValue(section.id, field.key, e.target.value)}
                        className="rounded-lg border-gray-200 focus-visible:border-teal"
                      />
                    )}
                  </label>
                ))}
              </div>
            )}

            {section.type === 'richtext' && (
              <div className="space-y-3">
                <Textarea
                  placeholder={section.placeholder ?? ''}
                  value={sectionValues.richtext ?? ''}
                  onChange={(e) => updateValue(section.id, 'richtext', e.target.value)}
                  className="min-h-[150px] rounded-lg border-gray-200 focus-visible:border-teal"
                />
                {section.id === 'conclusion' && (
                  <label className="flex items-center gap-2 text-sm text-midnight">
                    <input
                      type="checkbox"
                      checked={sectionValues.renew_exam === 'true'}
                      onChange={(e) => updateValue(section.id, 'renew_exam', e.target.checked ? 'true' : 'false')}
                    />
                    Examen à renouveler pour cause technique
                  </label>
                )}
              </div>
            )}
          </section>
        )
      })}

      <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="font-heading text-midnight">Extraction auto (copier-coller brut)</p>
        <Textarea
          placeholder="Collez ici un résumé brut (ex: AHI: 22, SpO2 min: 84, Efficiency: 68...)"
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          className="min-h-[110px] bg-[#f8fafc] border-2 border-transparent rounded-xl focus-visible:border-teal focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-teal/6"
        />
        <Button type="button" variant="outline" onClick={applyParsedRawText} className="border-gray-200">
          Extraire automatiquement les métriques
        </Button>
      </div>

      <div className="sticky bottom-0 z-20 -mx-6 mt-6 flex flex-col gap-3 border-t border-gray-100 bg-white px-6 py-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-emerald-600 font-body inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          {lastSavedAt ? `Sauvegardé à ${lastSavedAt}` : 'Autosave actif'}
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => void generateAutoDraft()}
            disabled={generatingDraft || !reportId}
            className="bg-midnight text-white hover:bg-midnight/90"
          >
            {generatingDraft ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération du brouillon...
              </>
            ) : (
              'Auto-générer le brouillon médical'
            )}
          </Button>

          <Button
            type="button"
            onClick={() => void saveReport()}
            disabled={saving || !reportId}
            className="border-2 border-teal text-teal bg-transparent hover:bg-teal/5"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              'Sauvegarder'
            )}
          </Button>

          <Button
            type="button"
            onClick={() => void generatePdf()}
            disabled={generatingPdf || !reportId}
            className="bg-gradient-to-br from-[#c8a45a] to-[#b8913f] text-white hover:shadow-md hover:-translate-y-px transition-all disabled:opacity-50"
          >
            {generatingPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              'Générer le PDF'
            )}
          </Button>
        </div>
      </div>

      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PDF généré</DialogTitle>
            <DialogDescription>
              Le rapport PDF a été généré avec succès.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90"
              >
                Télécharger le PDF
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
