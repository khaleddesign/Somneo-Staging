/**
 * Rate limiter in-memory (par processus Node.js).
 * Suffisant pour une instance unique / Vercel Edge.
 * Pour multi-instance, remplacer par @upstash/ratelimit + Redis.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Nettoyage périodique pour éviter les fuites mémoire
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 60_000)

/**
 * @returns true si la requête est autorisée, false si le quota est dépassé
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}

/** Retourne les headers standard 429 */
export function rateLimitHeaders(windowMs: number, limit: number): Record<string, string> {
  return {
    'Retry-After': String(Math.ceil(windowMs / 1000)),
    'X-RateLimit-Limit': String(limit),
  }
}
