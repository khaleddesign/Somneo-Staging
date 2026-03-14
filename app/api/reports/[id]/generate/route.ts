import { NextResponse, type NextRequest } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReportPDF } from '@/lib/pdf/ReportPDF'
import { logAudit } from '@/lib/audit'
import { decrypt } from '@/lib/encryption'
import { sendEmail } from '@/lib/mail'

export const runtime = 'nodejs'
export const maxDuration = 60 // Vercel Pro — génération PDF ~10-20s

// ─── helpers ──────────────────────────────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toValues(raw: unknown): Record<string, Record<string, string>> {
  if (!isObject(raw) || !isObject(raw.values)) return {}

  const result: Record<string, Record<string, string>> = {}
  Object.entries(raw.values).forEach(([sectionId, sectionValues]) => {
    if (!isObject(sectionValues)) return
    const normalized: Record<string, string> = {}
    Object.entries(sectionValues).forEach(([key, val]) => {
      if (typeof val === 'string')       normalized[key] = val
      else if (typeof val === 'number')  normalized[key] = String(val)
    })
    result[sectionId] = normalized
  })

  return result
}

// ─── POST /api/reports/[id]/generate ─────────────────────────────────────────

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Auth
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Profil agent/admin
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile || !['agent', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Rapport
    const { data: report, error: reportError } = await admin
      .from('study_reports')
      .select('id, study_id, content, created_at')
      .eq('id', id)
      .maybeSingle()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 })
    }

    // Étude
    const { data: study, error: studyError } = await admin
      .from('studies')
      .select('id, study_type, patient_reference, status, client_id')
      .eq('id', report.study_id)
      .maybeSingle()

    if (studyError || !study) {
      return NextResponse.json({ error: 'Étude introuvable' }, { status: 404 })
    }

    // Déchiffrement
    study.patient_reference = decrypt(study.patient_reference)

    const values = toValues(report.content)

    const nowIso  = new Date().toISOString()
    const nowDate = new Date().toLocaleDateString('fr-FR')

    const reportForPdf = {
      ...report,
      content: {
        ...(isObject(report.content) ? report.content : {}),
        values,
      },
    }

    const document = React.createElement(ReportPDF, {
      report: reportForPdf,
      study,
      agentName: profile.full_name || 'Agent',
      generatedAt: nowDate,
    }) as unknown as Parameters<typeof renderToBuffer>[0]

    const pdfBuffer = await renderToBuffer(document)

    // Upload Supabase Storage
    const timestamp   = Date.now()
    const storagePath = `reports/${study.id}/rapport-${timestamp}.pdf`

    const { error: uploadError } = await admin.storage
      .from('reports-files')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('[api/reports/[id]/generate] Storage upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const fullPdfPath = `reports-files/${storagePath}`

    // Mise à jour study_reports
    const { error: reportUpdateError } = await admin
      .from('study_reports')
      .update({ pdf_path: fullPdfPath, status: 'validated', validated_at: nowIso, updated_at: nowIso })
      .eq('id', report.id)

    if (reportUpdateError) {
      console.error('[api/reports/[id]/generate] study_reports update error:', reportUpdateError)
      return NextResponse.json({ error: reportUpdateError.message }, { status: 500 })
    }

    // Mise à jour studies
    const { error: studyUpdateError } = await admin
      .from('studies')
      .update({ report_path: fullPdfPath, status: 'termine', completed_at: nowIso, updated_at: nowIso })
      .eq('id', study.id)

    if (studyUpdateError) {
      console.error('[api/reports/[id]/generate] studies update error:', studyUpdateError)
      return NextResponse.json({ error: studyUpdateError.message }, { status: 500 })
    }

    // Historique
    await admin.from('study_history').insert({
      study_id:   study.id,
      old_status: study.status,
      new_status: 'termine',
      changed_by: user.id,
      changed_at: nowIso,
    })

    // Notification email client (fire-and-forget)
    const { data: clientProfile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', study.client_id)
      .maybeSingle()

    if (clientProfile?.email) {
      await sendEmail({
        to: clientProfile.email,
        subject: 'SomnoConnect - Votre rapport est disponible',
        html: '<p>Bonjour,</p><p>Le compte-rendu de votre étude du sommeil est maintenant disponible sur votre espace client.</p>',
      })
    }

    // URL signée (1 h)
    const signedPath = fullPdfPath.startsWith('reports-files/')
      ? fullPdfPath.slice('reports-files/'.length)
      : fullPdfPath

    const { data: signed, error: signedError } = await admin.storage
      .from('reports-files')
      .createSignedUrl(signedPath, 15 * 60)

    if (signedError || !signed?.signedUrl) {
      console.error('[api/reports/[id]/generate] Signed URL error:', signedError)
      return NextResponse.json(
        { error: signedError?.message || 'PDF généré mais URL signée indisponible' },
        { status: 500 },
      )
    }

    await logAudit(user.id, 'generate_pdf', 'report', id, { study_id: study.id })

    return NextResponse.json({ success: true, pdf_url: signed.signedUrl })
  } catch (err: unknown) {
    console.error('[api/reports/[id]/generate] Unhandled error:', err)
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
