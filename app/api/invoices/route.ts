import { NextResponse, type NextRequest } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InvoicePDF } from '@/lib/pdf/InvoicePDF'
import { decrypt } from '@/lib/encryption'

interface CreateInvoiceBody {
  client_id?: string
  mode?: 'per_study' | 'monthly'
  billing_month?: string
  study_ids?: string[]
}

function toDateYmd(date: Date): string {
  return date.toISOString().slice(0, 10)
}

async function requireAdminUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Access denied' }, { status: 403 }) }
  }

  return { user, admin }
}

async function requireAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return { error: NextResponse.json({ error: 'Access denied' }, { status: 403 }) }
  }

  return { user, role: profile.role, admin }
}

async function generateInvoiceNumber(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `FAC-${year}-`

  const { data: latest, error } = await admin
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[invoices] Insert settings Error:', error)
    throw new Error('Database error')
  }

  const lastSequence = latest?.invoice_number
    ? Number(latest.invoice_number.slice(prefix.length)) || 0
    : 0

  const nextSequence = String(lastSequence + 1).padStart(4, '0')
  return `${prefix}${nextSequence}`
}

export async function GET() {
  try {
    const auth = await requireAuthenticatedUser()
    if ('error' in auth) return auth.error

    const { admin, user, role } = auth

    if (!['admin', 'client'].includes(role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    let query = admin
      .from('invoices')
      .select(`
        id,
        invoice_number,
        client_id,
        mode,
        billing_month,
        study_ids,
        subtotal_ht,
        tva_rate,
        total_ttc,
        status,
        pdf_path,
        notes,
        due_date,
        created_by,
        created_at,
        updated_at,
        client:profiles!invoices_client_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false })

    if (role === 'client') {
      query = query.eq('client_id', user.id)
    }

    const { data, error } = await query

    if (error) {
      console.error('[invoices] Settings Fetch Error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ invoices: data ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateInvoiceBody
    const clientId = body.client_id?.trim()
    const mode = body.mode
    const billingMonth = body.billing_month?.trim()
    const studyIds = Array.isArray(body.study_ids) ? body.study_ids.filter(Boolean) : []

    if (!clientId || !mode) {
      return NextResponse.json({ error: 'client_id et mode requis' }, { status: 400 })
    }

    const auth = await requireAdminUser()
    if ('error' in auth) return auth.error

    const { user, admin: adminClient } = auth

    let studies: Array<{
      id: string
      study_type: string
      patient_reference?: string | null
      created_at?: string | null
    }> = []

    if (studyIds.length > 0) {
      const { data, error } = await adminClient
        .from('studies')
        .select('id, study_type, patient_reference, created_at')
        .eq('client_id', clientId)
        .in('id', studyIds)

      if (error) {
        console.error('[invoices] Save Error:', error)
        return NextResponse.json({ error: 'Error lors de l\'enregistrement' }, { status: 500 })
      }
      studies = data ?? []
    } else {
      if (!billingMonth) {
        return NextResponse.json(
          { error: 'billing_month requis si study_ids est vide' },
          { status: 400 },
        )
      }

      const monthStart = new Date(`${billingMonth}-01T00:00:00.000Z`)
      if (Number.isNaN(monthStart.getTime())) {
        return NextResponse.json({ error: 'billing_month invalide (attendu: YYYY-MM)' }, { status: 400 })
      }
      const monthEnd = new Date(monthStart)
      monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1)

      const { data, error } = await adminClient
        .from('studies')
        .select('id, study_type, patient_reference, created_at')
        .eq('client_id', clientId)
        .eq('status', 'termine')
        .gte('completed_at', monthStart.toISOString())
        .lt('completed_at', monthEnd.toISOString())

      if (error) {
        console.error('[invoices] Transaction Error:', error)
        return NextResponse.json({ error: 'Error lors de la finalisation' }, { status: 500 })
      }
      studies = data ?? []
    }

    if (studies.length === 0) {
      return NextResponse.json({ error: 'No billable studies found' }, { status: 400 })
    }

    const uniqueTypes = [...new Set(studies.map((s) => s.study_type))]
    const { data: settings, error: settingsError } = await adminClient
      .from('invoice_settings')
      .select('study_type, price_ht')
      .in('study_type', uniqueTypes)

    if (settingsError) {
      return NextResponse.json({ error: settingsError.message }, { status: 500 })
    }

    const priceMap = new Map<string, number>()
    ;(settings ?? []).forEach((setting) => {
      priceMap.set(setting.study_type, Number(setting.price_ht ?? 0))
    })

    const subtotal = studies.reduce((acc, study) => acc + (priceMap.get(study.study_type) ?? 0), 0)
    const tvaRate = 0
    const totalTtc = subtotal * (1 + tvaRate / 100)

    const invoiceNumber = await generateInvoiceNumber(adminClient)

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    const { data: created, error: createError } = await adminClient
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        client_id: clientId,
        mode,
        billing_month: billingMonth || null,
        study_ids: studies.map((study) => study.id),
        subtotal_ht: Number(subtotal.toFixed(2)),
        tva_rate: Number(tvaRate.toFixed(2)),
        total_ttc: Number(totalTtc.toFixed(2)),
        status: 'draft',
        due_date: toDateYmd(dueDate),
        created_by: user.id,
      })
      .select('*')
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    const { data: clientData, error: clientError } = await adminClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', clientId)
      .maybeSingle()

    if (clientError) {
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }

    const pricesByType = Object.fromEntries(
      (settings ?? []).map((setting) => [setting.study_type, Number(setting.price_ht ?? 0)]),
    )

    const invoiceData = {
      invoice_number: created.invoice_number,
      mode: created.mode,
      status: created.status,
      billing_month: created.billing_month,
      due_date: created.due_date,
      created_at: created.created_at,
      subtotal_ht: Number(created.subtotal_ht ?? 0),
      tva_rate: Number(created.tva_rate ?? 0),
      total_ttc: Number(created.total_ttc ?? 0),
    }

    const studiesData = studies.map((study) => ({
      id: study.id,
      study_type: study.study_type,
      patient_reference: decrypt(study.patient_reference ?? ''),
      created_at: study.created_at ?? null,
    }))

    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDF, {
        invoice: invoiceData,
        studies: studiesData,
        client: clientData ?? { full_name: null, email: null },
        pricesByType,
      }) as unknown as Parameters<typeof renderToBuffer>[0],
    )

    const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets()
    if (bucketsError) {
      return NextResponse.json({ error: bucketsError.message }, { status: 500 })
    }

    const bucketExists = (buckets ?? []).some((bucket) => bucket.name === 'invoices-files')
    if (!bucketExists) {
      const { error: createBucketError } = await adminClient.storage.createBucket('invoices-files', {
        public: false,
      })
      if (createBucketError) {
        return NextResponse.json({ error: createBucketError.message }, { status: 500 })
      }
    }

    const fileName = `${created.invoice_number}.pdf`
    const { error: uploadError } = await adminClient.storage
      .from('invoices-files')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: updatedInvoice, error: updateError } = await adminClient
      .from('invoices')
      .update({ pdf_path: fileName, updated_at: new Date().toISOString() })
      .eq('id', created.id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ invoice: updatedInvoice }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
