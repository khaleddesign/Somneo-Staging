import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// ---------------------------------------------------------------------------
// AWS Signature V4 for Cloudflare R2 — streaming PUT uses UNSIGNED-PAYLOAD
// to avoid loading large EDF/ZIP files into memory.
// ---------------------------------------------------------------------------

const enc = new TextEncoder()

async function hmacBuf(keyBuf: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', key, enc.encode(data))
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(data))
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function buf2hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

interface R2Creds { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string }

async function buildAuthHeaders(
  method: string,
  key: string,
  creds: R2Creds,
  extraHeaders: Record<string, string> = {},
  payloadHash = 'UNSIGNED-PAYLOAD',
): Promise<Record<string, string>> {
  const now = new Date()
  const amzDate = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const dateShort = amzDate.slice(0, 8)
  const host = `${creds.accountId}.r2.cloudflarestorage.com`

  const baseHdrs: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...extraHeaders,
  }

  const sortedKeys = Object.keys(baseHdrs).sort()
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${baseHdrs[k]}`).join('\n') + '\n'
  const signedHeadersStr = sortedKeys.join(';')
  const canonicalReq = [method, `/${creds.bucket}/${key}`, '', canonicalHeaders, signedHeadersStr, payloadHash].join('\n')

  const scope = `${dateShort}/auto/s3/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256Hex(canonicalReq)].join('\n')

  const seed = enc.encode(`AWS4${creds.secretAccessKey}`)
  const sigKey = await hmacBuf(
    await hmacBuf(await hmacBuf(await hmacBuf(seed.buffer as ArrayBuffer, dateShort), 'auto'), 's3'),
    'aws4_request',
  )
  const signature = buf2hex(await hmacBuf(sigKey, stringToSign))
  const authorization = `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${scope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`

  return { ...baseHdrs, authorization }
}

async function existsInR2(creds: R2Creds, key: string): Promise<boolean> {
  const hdrs = await buildAuthHeaders('HEAD', key, creds, {}, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  const url = `https://${creds.accountId}.r2.cloudflarestorage.com/${creds.bucket}/${key}`
  const res = await fetch(url, { method: 'HEAD', headers: hdrs })
  await res.body?.cancel()
  if (res.status === 200) return true
  if (res.status === 404) return false
  throw new Error(`R2 HEAD ${key} → ${res.status}`)
}

// Stream a file from Supabase Storage to R2 without buffering the entire body.
// Uses UNSIGNED-PAYLOAD to skip per-chunk hash computation.
async function streamToR2(
  creds: R2Creds,
  key: string,
  supabaseSignedUrl: string,
  contentType: string,
): Promise<void> {
  // Download from Supabase Storage as a stream
  const dlRes = await fetch(supabaseSignedUrl)
  if (!dlRes.ok) throw new Error(`Supabase download ${key} → ${dlRes.status}`)

  const contentLength = dlRes.headers.get('content-length') ?? ''
  const hdrs = await buildAuthHeaders('PUT', key, creds, {
    ...(contentLength ? { 'content-length': contentLength } : {}),
    'content-type': contentType,
  })

  const url = `https://${creds.accountId}.r2.cloudflarestorage.com/${creds.bucket}/${key}`
  // @ts-ignore: duplex required in some runtimes for streaming body
  const putRes = await fetch(url, { method: 'PUT', headers: hdrs, body: dlRes.body, duplex: 'half' })
  await putRes.body?.cancel()
  if (!putRes.ok) throw new Error(`R2 PUT ${key} → ${putRes.status}`)
}

// ---------------------------------------------------------------------------

const ALLOWED_ORIGIN = 'https://app.somnoventis.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-cron-secret, content-type',
}

const QUERIES = [
  { bucket: 'reports-files',  table: 'studies',  column: 'report_path', stripPrefix: 'reports-files/' as string | null },
  { bucket: 'study-files',    table: 'studies',  column: 'file_path',   stripPrefix: null as string | null },
  { bucket: 'invoices-files', table: 'invoices', column: 'pdf_path',    stripPrefix: null },
] as const

const PAGE_SIZE = 50
const TIME_LIMIT_MS = 55_000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) return respond({ error: 'Unauthorized' }, 401)

  // Accept either:
  //   Authorization: Bearer <CRON_SECRET>  (direct curl / legacy)
  //   x-cron-secret: <CRON_SECRET>         (from pg_cron via vault secret)
  const bearer = req.headers.get('authorization') === `Bearer ${cronSecret}`
  const custom = req.headers.get('x-cron-secret') === cronSecret
  if (!bearer && !custom) return respond({ error: 'Unauthorized' }, 401)

  try {
    const creds: R2Creds = {
      accountId:       Deno.env.get('R2_ACCOUNT_ID')!,
      accessKeyId:     Deno.env.get('R2_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
      bucket:          Deno.env.get('R2_BUCKET_NAME')!,
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: cp } = await admin.from('backup_checkpoints').select('*').eq('id', 'singleton').maybeSingle()
    let queryIndex: number = cp?.query_index ?? 0
    let queryOffset: number = cp?.query_offset ?? 0
    let totalCopied: number = cp?.total_copied ?? 0

    await admin.from('backup_checkpoints').upsert({
      id: 'singleton', query_index: queryIndex, query_offset: queryOffset,
      total_copied: totalCopied, last_started_at: new Date().toISOString(),
    })

    const startTime = Date.now()
    let copiedThisRun = 0
    let failedThisRun = 0
    const errors: string[] = []

    const saveCheckpoint = () =>
      admin.from('backup_checkpoints')
        .update({ query_index: queryIndex, query_offset: queryOffset, total_copied: totalCopied })
        .eq('id', 'singleton')

    outer: while (queryIndex < QUERIES.length) {
      if (Date.now() - startTime >= TIME_LIMIT_MS) break

      const q = QUERIES[queryIndex]
      const { data: rows, error: dbErr } = await admin
        .from(q.table).select(q.column).not(q.column, 'is', null)
        .order('created_at', { ascending: true })
        .range(queryOffset, queryOffset + PAGE_SIZE - 1)

      if (dbErr) { console.error('[backup-r2] DB error:', dbErr.message); break }

      if (!rows || rows.length === 0) {
        queryIndex++; queryOffset = 0
        await saveCheckpoint(); continue
      }

      if (Date.now() - startTime >= TIME_LIMIT_MS) break

      // Build candidates for this page
      const candidates = (rows as Record<string, string | null>[])
        .map(row => {
          const raw = row[q.column]
          if (!raw) return null
          const storagePath = q.stripPrefix && raw.startsWith(q.stripPrefix) ? raw.slice(q.stripPrefix.length) : raw
          return { storagePath, r2Key: `${q.bucket}/${storagePath}` }
        })
        .filter((c): c is { storagePath: string; r2Key: string } => c !== null)

      // Parallel HEAD checks for the whole page — ~50x faster than sequential
      const existsFlags = await Promise.all(
        candidates.map(c => existsInR2(creds, c.r2Key).catch(() => false))
      )

      const pageStart = queryOffset
      for (let i = 0; i < candidates.length; i++) {
        if (Date.now() - startTime >= TIME_LIMIT_MS) {
          // Save exact mid-page position so next run doesn't re-process from pageStart
          queryOffset = pageStart + i
          await saveCheckpoint()
          break outer
        }
        if (existsFlags[i]) continue

        const { storagePath, r2Key } = candidates[i]
        try {
          const { data: signed, error: signErr } = await admin.storage.from(q.bucket).createSignedUrl(storagePath, 120)
          if (signErr || !signed?.signedUrl) { failedThisRun++; continue }

          const ext = storagePath.split('.').pop()?.toLowerCase() ?? ''
          const contentType = ext === 'pdf' ? 'application/pdf' : ext === 'zip' ? 'application/zip' : 'application/octet-stream'

          await streamToR2(creds, r2Key, signed.signedUrl, contentType)
          copiedThisRun++; totalCopied++
          // Save after each upload so mid-page progress survives a timeout
          queryOffset = pageStart + i + 1
          await saveCheckpoint()
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          console.error('[backup-r2] error:', r2Key, msg)
          if (errors.length < 3) errors.push(`${r2Key}: ${msg}`)
          failedThisRun++
        }
      }

      queryOffset = pageStart + rows.length
      await saveCheckpoint()
    }

    const isComplete = queryIndex >= QUERIES.length
    if (isComplete) {
      await admin.from('backup_checkpoints')
        .update({ query_index: 0, query_offset: 0, last_completed_at: new Date().toISOString() })
        .eq('id', 'singleton')
    }

    return respond({
      success: true,
      complete: isComplete,
      copied_this_run: copiedThisRun,
      failed_this_run: failedThisRun,
      total_copied: totalCopied,
      elapsed_ms: Date.now() - startTime,
      sample_errors: errors,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[backup-r2] fatal:', msg)
    return respond({ error: msg }, 500)
  }
})

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
