import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

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

  return { admin }
}

async function requireInvoiceReadUser() {
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

  if (profileError || !profile || !['admin', 'client'].includes(profile.role)) {
    return { error: NextResponse.json({ error: 'Access denied' }, { status: 403 }) }
  }

  return { admin, user, role: profile.role }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const auth = await requireInvoiceReadUser()
    if ('error' in auth) return auth.error

    const { admin, role, user } = auth

    const { data: invoice, error: invoiceError } = await admin
      .from('invoices')
      .select('pdf_path, client_id')
      .eq('id', id)
      .maybeSingle()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (role === 'client' && invoice.client_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!invoice.pdf_path) {
      return NextResponse.json({ error: 'PDF unavailable' }, { status: 404 })
    }

    const storagePath = invoice.pdf_path.startsWith('invoices-files/')
      ? invoice.pdf_path.slice('invoices-files/'.length)
      : invoice.pdf_path

    const { data: signed, error: signedError } = await admin.storage
      .from('invoices-files')
      .createSignedUrl(storagePath, 15 * 60)

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json(
        { error: signedError?.message || 'Unable to generate signed URL' },
        { status: 500 },
      )
    }

    await logAudit(user!.id, 'download_invoice', 'invoice', id)

    return NextResponse.json({ url: signed.signedUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
