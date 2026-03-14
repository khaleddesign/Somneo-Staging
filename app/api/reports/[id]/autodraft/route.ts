import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateMedicalDraft } from '@/lib/reports/medicalDraft'
import { decrypt } from '@/lib/encryption'

interface ReportContent {
  values?: Record<string, Record<string, string>>
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeValues(content: unknown): Record<string, Record<string, string>> {
  if (!isObject(content) || !isObject(content.values)) return {}

  const values: Record<string, Record<string, string>> = {}
  Object.entries(content.values).forEach(([sectionId, sectionValue]) => {
    if (!isObject(sectionValue)) return
    const normalizedSection: Record<string, string> = {}
    Object.entries(sectionValue).forEach(([key, value]) => {
      if (typeof value === 'string') normalizedSection[key] = value
      if (typeof value === 'number') normalizedSection[key] = String(value)
    })
    values[sectionId] = normalizedSection
  })

  return values
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile || !['agent', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: report, error: reportError } = await admin
      .from('study_reports')
      .select('id, study_id, content')
      .eq('id', id)
      .maybeSingle()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const { data: study, error: studyError } = await admin
      .from('studies')
      .select('id, study_type, patient_reference, assigned_agent_id')
      .eq('id', report.study_id)
      .maybeSingle()

    if (studyError || !study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 })
    }

    if (profile.role !== 'admin' && study.assigned_agent_id !== user.id) {
      return NextResponse.json({ error: 'Study not assigned to this agent' }, { status: 403 })
    }

    const currentValues = normalizeValues(report.content)

    const draft = generateMedicalDraft(
      {
        patientReference: decrypt(study.patient_reference),
        studyType: study.study_type,
        agentName: profile.full_name || 'Agent',
      },
      currentValues
    )

    const nextValues: Record<string, Record<string, string>> = {
      ...currentValues,
      technical: {
        ...(currentValues.technical ?? {}),
        text: draft.sections.technical,
      },
      sleep_architecture: {
        ...(currentValues.sleep_architecture ?? {}),
        text: draft.sections.sleep_architecture,
      },
      respiratory: {
        ...(currentValues.respiratory ?? {}),
        text: draft.sections.respiratory,
      },
      movements: {
        ...(currentValues.movements ?? {}),
        text: draft.sections.movements,
      },
      oxymetry: {
        ...(currentValues.oxymetry ?? {}),
        text: draft.sections.oxymetry,
      },
      conclusion: {
        ...(currentValues.conclusion ?? {}),
        richtext: draft.conclusion,
      },
    }

    const previousContent = isObject(report.content) ? (report.content as ReportContent) : {}

    const updatedContent = {
      ...previousContent,
      values: nextValues,
      ai_draft_generated_at: new Date().toISOString(),
      ai_draft_version: 'aasm-2024-rule-based-v1',
    }

    const { data: updated, error: updateError } = await admin
      .from('study_reports')
      .update({
        content: updatedContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.id)
      .select('id, study_id, content, status, updated_at')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      report: updated,
      message: 'Medical draft automatically generated (medical validation required).',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
