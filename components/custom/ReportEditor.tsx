"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const sectionsToRender = useMemo(() => {
    if (template?.sections?.length) return template.sections
    if (content.sections?.length) return content.sections
    return [] as TemplateSection[]
  }, [template, content.sections])

  const saveReport = useCallback(async () => {
    if (!reportId) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
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
    } finally {
      setSaving(false)
    }
  }, [content, reportId])

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
          setContent((prev) => ({
            ...prev,
            ...normalized,
            sections: loadedTemplate.sections,
          }))
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
      void saveReport()
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
              <Textarea
                placeholder={section.placeholder ?? ''}
                value={sectionValues.text ?? ''}
                onChange={(e) => updateValue(section.id, 'text', e.target.value)}
                className="rounded-lg border-gray-200 focus-visible:border-teal"
              />
            )}

            {section.type === 'metrics' && (
              <div className="grid gap-4 sm:grid-cols-2">
                {(section.fields ?? []).map((field) => (
                  <label key={field.key} className="space-y-1">
                    <span className="text-sm text-midnight">
                      {field.label}{field.unit ? ` (${field.unit})` : ''}
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={sectionValues[field.key] ?? ''}
                      onChange={(e) => updateValue(section.id, field.key, e.target.value)}
                      className="rounded-lg border-gray-200 focus-visible:border-teal"
                    />
                  </label>
                ))}
              </div>
            )}

            {section.type === 'richtext' && (
              <Textarea
                placeholder={section.placeholder ?? ''}
                value={sectionValues.richtext ?? ''}
                onChange={(e) => updateValue(section.id, 'richtext', e.target.value)}
                className="min-h-[150px] rounded-lg border-gray-200 focus-visible:border-teal"
              />
            )}
          </section>
        )
      })}

      <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">
          {lastSavedAt ? `Sauvegardé à ${lastSavedAt}` : 'Pas encore sauvegardé'}
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => void saveReport()}
            disabled={saving || !reportId}
            className="bg-teal text-white hover:bg-teal/90"
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
            disabled
            className="bg-gold text-white opacity-50 hover:bg-gold"
          >
            Générer le PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
