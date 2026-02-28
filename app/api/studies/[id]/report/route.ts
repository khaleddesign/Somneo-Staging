import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
