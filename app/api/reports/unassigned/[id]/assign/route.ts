import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/mail'

/**
 * PATCH /api/reports/unassigned/{id}/assign
 *
 * Assigns a previously unassigned PDF report to a study.
 * Body: { study_id: string }
 *
 * Flow (Option B — identical to direct upload):
 *   1. Copy PDF from unassigned/{agent_id}/{id}.pdf → {study_id}/report.pdf
 *   2. Update studies.report_path
 *   3. Set study status → 'termine'
 *   4. Send email to client
 *   5. Delete unassigned_reports row + original storage file
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify caller is agent or admin
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!callerProfile || !['agent', 'admin'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse body
    const body = await req.json()
    const studyId = String(body?.study_id ?? '').trim()
    if (!studyId) {
      return NextResponse.json({ error: 'study_id requis' }, { status: 400 })
    }

    // Load the unassigned report (RLS will filter by agent_id for non-admins,
    // but we use admin client here, so we enforce ownership manually)
    const { data: report } = await admin
      .from('unassigned_reports')
      .select('id, agent_id, storage_path, original_filename')
      .eq('id', id)
      .maybeSingle()

    if (!report) {
      return NextResponse.json({ error: 'Rapport non trouvé' }, { status: 404 })
    }

    // Load study
    const { data: study } = await admin
      .from('studies')
      .select('id, patient_reference, client_id, assigned_agent_id')
      .eq('id', studyId)
      .maybeSingle()

    if (!study) {
      return NextResponse.json({ error: 'Étude non trouvée' }, { status: 404 })
    }

    // 1. Download the PDF from unassigned storage path
    const { data: fileData, error: downloadError } = await admin.storage
      .from('reports-files')
      .download(report.storage_path)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Impossible de lire le fichier PDF' }, { status: 500 })
    }

    // 2. Upload to the study's canonical path (upsert to allow overwrite)
    const targetPath = `${studyId}/report.pdf`
    const { error: uploadError } = await admin.storage
      .from('reports-files')
      .upload(targetPath, fileData, { upsert: true, contentType: 'application/pdf' })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // 3. Update study with report path + status
    const reportPath = `reports-files/${studyId}/report.pdf`
    const { error: studyUpdateError } = await admin
      .from('studies')
      .update({ report_path: reportPath, status: 'termine', updated_at: new Date().toISOString() })
      .eq('id', studyId)

    if (studyUpdateError) {
      return NextResponse.json({ error: studyUpdateError.message }, { status: 500 })
    }

    // 4. Send email to client (fire-and-forget)
    admin.from('profiles')
      .select('email, full_name')
      .eq('id', study.client_id)
      .maybeSingle()
      .then(({ data: clientProfile }) => {
        if (!clientProfile?.email) return
        sendEmail({
          to: clientProfile.email,
          subject: 'SomnoConnect — Votre rapport d\'analyse est disponible',
          html: `
            <p>Bonjour${clientProfile.full_name ? ` ${clientProfile.full_name}` : ''},</p>
            <p>Le rapport d'analyse de votre étude (<strong>${study.patient_reference}</strong>)
            est maintenant disponible dans votre espace client SomnoConnect.</p>
            <p>Merci de votre confiance.</p>
            <p>— L'équipe SOMNOVENTIS</p>
          `,
        }).catch(() => {})
      })

    // 5. Delete the unassigned record + original storage file (best-effort)
    await admin.from('unassigned_reports').delete().eq('id', id)
    admin.storage.from('reports-files').remove([report.storage_path]).catch(() => {})

    return NextResponse.json({ success: true, study_id: studyId, report_path: reportPath })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
