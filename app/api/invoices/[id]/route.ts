import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface UpdateInvoiceStatusBody {
  status?: 'sent' | 'paid' | 'cancelled'
}

async function requireAdminUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  }

  return { user, admin }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const auth = await requireAdminUser()
    if ('error' in auth) return auth.error

    const { admin } = auth

    const { data: invoice, error } = await admin
      .from('invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[invoices/[id]] Fetch Error:', error)
      return NextResponse.json({ error: 'Erreur lors de la récupération de la facture' }, { status: 500 })
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    }

    const studyIds = Array.isArray(invoice.study_ids) ? invoice.study_ids.filter(Boolean) : []

    let studies: Array<{
      id: string
      patient_reference: string
      study_type: string
      status: string
      completed_at: string | null
      submitted_at: string
    }> = []

    if (studyIds.length > 0) {
      const { data: studyData, error: studiesError } = await admin
        .from('studies')
        .select('id, patient_reference, study_type, status, completed_at, submitted_at')
        .in('id', studyIds)

      if (studiesError) {
        return NextResponse.json({ error: studiesError.message }, { status: 500 })
      }

      studies = studyData ?? []
    }

    return NextResponse.json({ invoice, studies })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = (await req.json()) as UpdateInvoiceStatusBody

    if (!body.status || !['sent', 'paid', 'cancelled'].includes(body.status)) {
      return NextResponse.json({ error: 'status invalide' }, { status: 400 })
    }

    const auth = await requireAdminUser()
    if ('error' in auth) return auth.error

    const { admin } = auth

    const { data: updated, error } = await admin
      .from('invoices')
      .update({
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('[invoices/[id]] Update Error:', error)
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    return NextResponse.json({ invoice: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
