import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const studyType = req.nextUrl.searchParams.get('study_type')?.trim()
    if (!studyType) {
      return NextResponse.json({ error: 'Paramètre study_type requis' }, { status: 400 })
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
    const { data: template, error } = await admin
      .from('report_templates')
      .select('id, name, study_type, sections, created_by, created_at')
      .eq('study_type', studyType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!template) {
      return NextResponse.json({ error: `Template introuvable pour ${studyType}` }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
