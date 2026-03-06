import { NextResponse, type NextRequest } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildReportHtml, type ReportTemplateData } from '@/lib/pdf/report-template'

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

// ─── puppeteer PDF ─────────────────────────────────────────────────────────────

async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 720 },
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || await chromium.executablePath(),
    headless: true,
  })

  try {
    const page = await browser.newPage()
    // waitUntil:'networkidle0' permet aux Google Fonts de se charger
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 })
    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return Buffer.from(pdfUint8)
  } finally {
    await browser.close()
  }
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
      .select('id, study_id, content')
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

    console.log('[generate] report.content:', JSON.stringify(report.content))
    const values = toValues(report.content)
    console.log('[generate] values extracted:', JSON.stringify(values))

    const nowIso  = new Date().toISOString()
    const nowDate = new Date().toLocaleDateString('fr-FR')

    // Construire l'HTML puis générer le PDF via puppeteer
    const html = buildReportHtml({
      studyType:        study.study_type as ReportTemplateData['studyType'],
      patientReference: study.patient_reference,
      agentName:        profile.full_name || 'Agent',
      generatedAt:      nowDate,
      values,
    })

    const pdfBuffer = await renderHtmlToPdf(html)

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
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const fullPdfPath = `reports-files/${storagePath}`

    // Mise à jour study_reports
    const { error: reportUpdateError } = await admin
      .from('study_reports')
      .update({ pdf_path: fullPdfPath, status: 'validated', validated_at: nowIso, updated_at: nowIso })
      .eq('id', report.id)

    if (reportUpdateError) {
      return NextResponse.json({ error: reportUpdateError.message }, { status: 500 })
    }

    // Mise à jour studies
    const { error: studyUpdateError } = await admin
      .from('studies')
      .update({ report_path: fullPdfPath, status: 'termine', completed_at: nowIso, updated_at: nowIso })
      .eq('id', study.id)

    if (studyUpdateError) {
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
      const notifUrl = new URL(
        '/api/notifications',
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      ).toString()
      await fetch(notifUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:   clientProfile.email,
          subject: 'SomnoConnect - Votre rapport est disponible',
          message: '<p>Bonjour,</p><p>Le compte-rendu de votre étude du sommeil est maintenant disponible sur votre espace client.</p>',
        }),
      }).catch(() => undefined)
    }

    // URL signée (1 h)
    const signedPath = fullPdfPath.startsWith('reports-files/')
      ? fullPdfPath.slice('reports-files/'.length)
      : fullPdfPath

    const { data: signed, error: signedError } = await admin.storage
      .from('reports-files')
      .createSignedUrl(signedPath, 60 * 60)

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json(
        { error: signedError?.message || 'PDF généré mais URL signée indisponible' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, pdf_url: signed.signedUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
