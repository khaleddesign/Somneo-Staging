import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

const ALLOWED_ORIGINS = [
  'https://app.somnoventis.com',
  'https://somnoventis.com',
  // Développement local
  'http://localhost:3000',
  'http://localhost:3001',
]

// Routes sensibles avec leurs limites (requêtes / fenêtre)
const RATE_LIMITS: Array<{ pattern: RegExp; limit: number; windowMs: number }> = [
  { pattern: /^\/api\/auth\/signup$/,  limit: 5,  windowMs: 15 * 60 * 1000 }, // 5 / 15 min
  { pattern: /^\/api\/invite$/,        limit: 10, windowMs: 60 * 60 * 1000 }, // 10 / heure
  { pattern: /^\/api\/auth\/invite$/,  limit: 10, windowMs: 60 * 60 * 1000 }, // 10 / heure
  { pattern: /^\/api\/comments$/,      limit: 30, windowMs: 60 * 1000       }, // 30 / min
  { pattern: /^\/api\/studies$/,       limit: 20, windowMs: 60 * 1000       }, // 20 / min
]

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin') ?? ''

  // ── CORS restrictif sur les routes API ──────────────────────────
  if (pathname.startsWith('/api/')) {
    const isAllowedOrigin = !origin || ALLOWED_ORIGINS.includes(origin)

    if (!isAllowedOrigin) {
      return new NextResponse(null, { status: 403 })
    }

    // Preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    // ── Rate limiting ────────────────────────────────────────────
    const ip = getClientIp(request)
    for (const rule of RATE_LIMITS) {
      if (rule.pattern.test(pathname)) {
        const key = `${pathname}:${ip}`
        if (!rateLimit(key, rule.limit, rule.windowMs)) {
          return NextResponse.json(
            { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
            {
              status: 429,
              headers: rateLimitHeaders(rule.windowMs),
            },
          )
        }
        break
      }
    }
  }

  // ── Gestion session Supabase (refresh cookie) ────────────────────
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
