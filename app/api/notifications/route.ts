import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/mail'

interface Body {
  email?: string
  subject?: string
  message?: string
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: Body = await req.json()
    const { email, subject, message } = body

    if (!email || !subject || !message) {
      return NextResponse.json({ error: 'email, subject and message are required' }, { status: 400 })
    }

    const { success, id, error } = await sendEmail({
      to: email,
      subject,
      html: message
    })

    if (!success) {
      return NextResponse.json({ 
        error: 'Error sending email', 
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, id })
  } catch (err: unknown) {
    console.error('[notifications] error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
