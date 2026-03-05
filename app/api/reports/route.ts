import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enhanceTemplateSections } from '@/lib/reports/templateSections'

interface CreateReportBody {
  study_id?: string
}

export async function GET(req: NextRequest) {
  try {
    const studyId = req.nextUrl.searchParams.get('study_id')
    if (!studyId) {
      return NextResponse.json({ error: 'Paramètre study_id requis' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: report, error } = await admin
      .from('study_reports')
      .select('id, study_id, agent_id, content, status, pdf_path, created_at, validated_at, updated_at')
      .eq('study_id', studyId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!report) {
      return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 })
    }

    return NextResponse.json({ report })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateReportBody
    const studyId = body.study_id?.trim()

    if (!studyId) {
      return NextResponse.json({ error: 'study_id requis' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile || !['agent', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: study, error: studyError } = await admin
      .from('studies')
      .select('id, study_type')
      .eq('id', studyId)
      .maybeSingle()

    if (studyError) {
      return NextResponse.json({ error: studyError.message }, { status: 500 })
    }

    if (!study) {
      return NextResponse.json({ error: 'Étude introuvable' }, { status: 404 })
    }

    const { data: template, error: templateError } = await admin
      .from('report_templates')
      .select('id, sections')
      .eq('study_type', study.study_type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (templateError) {
      return NextResponse.json({ error: templateError.message }, { status: 500 })
    }

    if (!template) {
      return NextResponse.json({ error: `Template introuvable pour ${study.study_type}` }, { status: 404 })
    }

    const enhancedSections = enhanceTemplateSections(study.study_type, template.sections)

    const { data: created, error: createError } = await admin
      .from('study_reports')
      .insert({
        study_id: study.id,
        agent_id: user.id,
        status: 'draft',
        content: {
          study_type: study.study_type,
          sections: enhancedSections,
        },
      })
      .select('id, study_id, agent_id, content, status, pdf_path, created_at, validated_at, updated_at')
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ report: created }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
