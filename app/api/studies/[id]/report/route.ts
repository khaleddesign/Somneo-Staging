import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const path = req.nextUrl.searchParams.get('path')
    if (!path) {
      return NextResponse.json({ error: 'Chemin du fichier requis' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer l'étude pour vérifier l'accès
    const { data: study, error: studyError } = await supabase
      .from('studies')
      .select('id, client_id')
      .eq('id', id)
      .single()

    if (studyError || !study) {
      return NextResponse.json({ error: 'Étude introuvable' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est soit le client, soit un agent/admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isClient = study.client_id === user.id
    const isAgent = profile?.role === 'agent' || profile?.role === 'admin'
    if (!isClient && !isAgent) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Télécharger depuis Supabase Storage
    const bucketName = path.split('/')[0]
    const filePath = path.substring(bucketName.length + 1)

    const { data: fileData, error: downloadErr } = await supabase.storage
      .from(bucketName)
      .download(filePath)

    if (downloadErr || !fileData) {
      return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
    }

    return new Response(fileData, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="rapport.pdf"`,
      },
    })
  } catch (err: unknown) {
    console.error('[GET /api/studies/[id]/report]', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  // Vérifier le rôle
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profileError || !profile || !['agent', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Fichier PDF requis' }, { status: 400 })
  }
  // Upload dans Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('report-files')
    .upload(`${id}/report.pdf`, file, { upsert: true, contentType: 'application/pdf' })
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }
  // Mettre à jour l'étude
  const reportPath = `report-files/${id}/report.pdf`
  const { error: updateError } = await supabase
    .from('studies')
    .update({ report_path: reportPath, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, report_path: reportPath })
}
