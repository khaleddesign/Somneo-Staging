import React, { type ReactElement } from 'react'
import { NextResponse, type NextRequest } from 'next/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ReportPDF from '@/lib/pdf/ReportPDF'

export const runtime = 'nodejs'

type StudyType = 'PSG' | 'PV' | 'MSLT' | 'MWT'
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
  fields?: TemplateField[]
}

interface ReportContent {
  values?: Record<string, Record<string, string>>
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toTemplateSections(raw: unknown): TemplateSection[] {
  if (!Array.isArray(raw)) return []

  return raw
    .filter(isObject)
    .map((section) => {
      const typeValue = section.type
      const type: SectionType =
        typeValue === 'info' || typeValue === 'text' || typeValue === 'metrics' || typeValue === 'richtext'
          ? typeValue
          : 'text'

      const fields = Array.isArray(section.fields)
        ? section.fields
            .filter(isObject)
            .map((field) => ({
              key: typeof field.key === 'string' ? field.key : '',
              label: typeof field.label === 'string' ? field.label : '',
              unit: typeof field.unit === 'string' ? field.unit : '',
            }))
            .filter((field) => field.key && field.label)
        : undefined

      return {
        id: typeof section.id === 'string' ? section.id : '',
        title: typeof section.title === 'string' ? section.title : '',
        type,
        fields,
      }
    })
    .filter((section) => section.id && section.title)
}

function toValues(raw: unknown): Record<string, Record<string, string>> {
  if (!isObject(raw) || !isObject(raw.values)) {
    return {}
  }

  const result: Record<string, Record<string, string>> = {}
  Object.entries(raw.values).forEach(([sectionId, sectionValues]) => {
    if (!isObject(sectionValues)) return

    const normalized: Record<string, string> = {}
    Object.entries(sectionValues).forEach(([fieldKey, fieldValue]) => {
      if (typeof fieldValue === 'string') {
        normalized[fieldKey] = fieldValue
      } else if (typeof fieldValue === 'number') {
        normalized[fieldKey] = String(fieldValue)
      }
    })
    result[sectionId] = normalized
  })

  return result
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile || !['agent', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: report, error: reportError } = await admin
      .from('study_reports')
      .select('id, study_id, content')
      .eq('id', id)
      .maybeSingle()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 })
    }

    const { data: study, error: studyError } = await admin
      .from('studies')
      .select('id, study_type, patient_reference, status, client_id')
      .eq('id', report.study_id)
      .maybeSingle()

    if (studyError || !study) {
      return NextResponse.json({ error: 'Étude introuvable' }, { status: 404 })
    }

    const { data: template, error: templateError } = await admin
      .from('report_templates')
      .select('id, sections')
      .eq('study_type', study.study_type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template introuvable' }, { status: 404 })
    }

    const sections = toTemplateSections(template.sections)
    const values = toValues(report.content)

    const nowIso = new Date().toISOString()
    const nowDate = new Date().toLocaleDateString('fr-FR')

    const pdfElement = React.createElement(ReportPDF, {
      studyType: study.study_type as StudyType,
      patientReference: study.patient_reference,
      agentName: profile.full_name || 'Agent',
      generatedAt: nowDate,
      sections,
      values,
    }) as unknown as ReactElement<DocumentProps>

    const pdfBuffer = await renderToBuffer(pdfElement)

    const timestamp = Date.now()
    const storagePath = `reports/${study.id}/rapport-${timestamp}.pdf`

    const { error: uploadError } = await admin.storage
      .from('reports-files')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const fullPdfPath = `reports-files/${storagePath}`

    const { error: reportUpdateError } = await admin
      .from('study_reports')
      .update({
        pdf_path: fullPdfPath,
        status: 'validated',
        validated_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', report.id)

    if (reportUpdateError) {
      return NextResponse.json({ error: reportUpdateError.message }, { status: 500 })
    }

    const { error: studyUpdateError } = await admin
      .from('studies')
      .update({
        report_path: fullPdfPath,
        status: 'termine',
        completed_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', study.id)

    if (studyUpdateError) {
      return NextResponse.json({ error: studyUpdateError.message }, { status: 500 })
    }

    await admin.from('study_history').insert({
      study_id: study.id,
      old_status: study.status,
      new_status: 'termine',
      changed_by: user.id,
      changed_at: nowIso,
    })

    const { data: clientProfile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', study.client_id)
      .maybeSingle()

    if (clientProfile?.email) {
      const notificationsUrl = new URL('/api/notifications', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').toString()
      await fetch(notificationsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: clientProfile.email,
          subject: 'SomnoConnect - Votre rapport est disponible',
          message: `<p>Bonjour,</p><p>Le compte-rendu de votre étude du sommeil est maintenant disponible sur votre espace client.</p>`,
        }),
      }).catch(() => undefined)
    }

    const signedPath = fullPdfPath.startsWith('reports-files/')
      ? fullPdfPath.slice('reports-files/'.length)
      : fullPdfPath

    const { data: signed, error: signedError } = await admin.storage
      .from('reports-files')
      .createSignedUrl(signedPath, 60 * 60)

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json({ error: signedError?.message || 'PDF généré mais URL signée indisponible' }, { status: 500 })
    }

    return NextResponse.json({ success: true, pdf_url: signed.signedUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
