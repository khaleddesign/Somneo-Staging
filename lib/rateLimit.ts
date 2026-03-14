/**
 * Rate limiting — Upstash Redis (production) with in-memory fallback (dev).
 *
 * Production: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN must be set.
 * Dev: falls back to in-memory Map (single process, good enough locally).
 *
 * Usage:
 *   const result = await limiters.signup.check(ip)
 *   if (!result.allowed) return NextResponse.json(..., { status: 429, headers: result.headers })
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export interface RateLimitResult {
  allowed: boolean
  headers: Record<string, string>
}

// ─── Upstash Redis (production) ───────────────────────────────────────────────

function makeUpstashLimiter(requests: number, window: `${number} ${'s' | 'm' | 'h' | 'd'}`) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
  })
}

// ─── In-memory fallback (dev / single-instance) ───────────────────────────────

interface MemEntry { count: number; resetAt: number }
const memStore = new Map<string, MemEntry>()

setInterval(() => {
  const now = Date.now()
  for (const [k, e] of memStore) if (now > e.resetAt) memStore.delete(k)
}, 60_000)

function memCheck(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const entry = memStore.get(key)
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, headers: { 'X-RateLimit-Limit': String(limit), 'X-RateLimit-Remaining': String(limit - 1) } }
  }
  if (entry.count >= limit) {
    return {
      allowed: false,
      headers: {
        'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': '0',
      },
    }
  }
  entry.count++
  return { allowed: true, headers: { 'X-RateLimit-Limit': String(limit), 'X-RateLimit-Remaining': String(limit - entry.count) } }
}

// ─── Limiter factory ──────────────────────────────────────────────────────────

interface LimiterConfig {
  requests: number
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`
  windowMs: number
}

function makeLimiter(config: LimiterConfig) {
  const useUpstash =
    typeof process.env.UPSTASH_REDIS_REST_URL === 'string' &&
    typeof process.env.UPSTASH_REDIS_REST_TOKEN === 'string'

  const upstash = useUpstash ? makeUpstashLimiter(config.requests, config.window) : null

  return {
    async check(key: string): Promise<RateLimitResult> {
      if (!upstash) return memCheck(key, config.requests, config.windowMs)

      const { success, limit, remaining, reset } = await upstash.limit(key)
      return {
        allowed: success,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          ...(success ? {} : { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) }),
        },
      }
    },
  }
}

// ─── Named limiters (one per route / use-case) ────────────────────────────────

export const limiters = {
  /** 5 signup attempts per IP per 15 minutes */
  signup:       makeLimiter({ requests: 5,  window: '15 m', windowMs: 15 * 60 * 1000 }),
  /** 3 password-reset emails per IP per 15 minutes */
  forgotPassword: makeLimiter({ requests: 3, window: '15 m', windowMs: 15 * 60 * 1000 }),
  /** 10 invitations per authenticated user per hour */
  invite:       makeLimiter({ requests: 10, window: '1 h',  windowMs: 60 * 60 * 1000 }),
  /** 30 comments per authenticated user per minute */
  comment:      makeLimiter({ requests: 30, window: '1 m',  windowMs: 60 * 1000 }),
}
