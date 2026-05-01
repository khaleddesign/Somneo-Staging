import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const token = req.headers.get('x-health-token')
  if (!token || token !== process.env.HEALTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const checks = {
    api: true,
    database: false,
    storage: false,
    timestamp: new Date().toISOString()
  }

  try {
    const admin = createAdminClient()
    const { error: dbError } = await admin.from('profiles').select('id').limit(1)
    checks.database = !dbError
    const { error: storageError } = await admin.storage.listBuckets()
    checks.storage = !storageError
  } catch (error) {
    console.error('[Health Check Error]', error)
  }

  const allHealthy = checks.database && checks.storage
  return NextResponse.json(checks, { status: allHealthy ? 200 : 503 })
}
