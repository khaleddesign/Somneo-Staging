/**
 * Idempotency utility for critical mutation endpoints (invoices, reports).
 *
 * Uses a pluggable store so that:
 *   - Tests inject an in-memory store (no DB required)
 *   - Production uses the DB-backed store (idempotency_keys table)
 *
 * Usage in API route:
 *   const key = req.headers.get('X-Idempotency-Key')
 *   if (!key) return NextResponse.json({ error: 'X-Idempotency-Key header required' }, { status: 400 })
 *   const { data, cached } = await withIdempotency(key, () => createInvoice(...), dbStore)
 *   return NextResponse.json(data, { status: cached ? 200 : 201 })
 */

export interface IdempotencyEntry {
  response: unknown
  status: number
}

export interface IdempotencyStore {
  get(key: string): Promise<IdempotencyEntry | null>
  set(key: string, response: unknown, status: number): Promise<void>
}

export interface IdempotencyResult<T> {
  data: T
  cached: boolean
}

const MAX_KEY_LENGTH = 256

/**
 * Wraps a function call with idempotency semantics.
 *
 * - If `key` is seen for the first time → execute `fn()`, store result, return it.
 * - If `key` already in store → return cached result without calling `fn()`.
 * - If `fn()` throws → error is NOT cached (caller can retry with same key).
 *
 * @param key - Idempotency key (UUID recommended, max 256 chars)
 * @param fn  - Async function to execute once
 * @param store - Pluggable store (DB in prod, in-memory in tests)
 */
export async function withIdempotency<T>(
  key: string,
  fn: () => Promise<T>,
  store: IdempotencyStore,
): Promise<IdempotencyResult<T>> {
  if (!key || key.trim() === '') {
    throw new Error('Idempotency key must be a non-empty string')
  }
  if (key.length > MAX_KEY_LENGTH) {
    throw new Error(`Idempotency key must be at most ${MAX_KEY_LENGTH} characters`)
  }

  const cached = await store.get(key)
  if (cached) {
    return { data: cached.response as T, cached: true }
  }

  // Execute — do NOT catch here; errors must not be stored
  const result = await fn()
  await store.set(key, result, 200)

  return { data: result, cached: false }
}

// ─── DB-backed store (production) ────────────────────────────────────────────

/**
 * Creates a Supabase-backed idempotency store using the `idempotency_keys` table.
 * Requires the migration 20260315_idempotency.sql to be applied.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeSupabaseIdempotencyStore(adminClient: any): IdempotencyStore {
  return {
    async get(key) {
      const { data } = await adminClient
        .from('idempotency_keys')
        .select('response, status')
        .eq('key', key)
        .maybeSingle()
      return data ?? null
    },
    async set(key, response, status) {
      await adminClient.from('idempotency_keys').upsert({ key, response, status })
    },
  }
}
