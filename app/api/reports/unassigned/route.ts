import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/reports/unassigned
 * Upload a PDF report without assigning it to a study.
 * Stores in reports-files/unassigned/{agent_id}/{uuid}.pdf
 * and inserts a row in unassigned_reports.
 *
 * GET /api/reports/unassigned
 * List unassigned reports for the current agent (admin sees all).
 */

async function getAgentOrAdmin(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return data?.role ?? null
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await getAgentOrAdmin(user.id)
    if (!role || !['agent', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Fichier PDF requis' }, { status: 400 })
    }

    const admin = createAdminClient()
    const reportId = crypto.randomUUID()
    const storagePath = `unassigned/${user.id}/${reportId}.pdf`

    const { error: uploadError } = await admin.storage
      .from('reports-files')
      .upload(storagePath, file, { upsert: false, contentType: 'application/pdf' })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: row, error: insertError } = await admin
      .from('unassigned_reports')
      .insert({
        id: reportId,
        agent_id: user.id,
        storage_path: storagePath,
        original_filename: file.name,
        file_size: file.size,
      })
      .select('id, storage_path, original_filename, file_size, uploaded_at')
      .single()

    if (insertError) {
      // Clean up orphaned storage file
      await admin.storage.from('reports-files').remove([storagePath])
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, report: row }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await getAgentOrAdmin(user.id)
    if (!role || !['agent', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()
    let query = admin
      .from('unassigned_reports')
      .select('id, agent_id, original_filename, file_size, uploaded_at')
      .order('uploaded_at', { ascending: false })

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reports: data ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
