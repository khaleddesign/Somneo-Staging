import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

const ALLOWED_ORIGINS = [
  'https://app.somnoventis.com',
  'https://somnoventis.com',
  'http://localhost:3000',
  'http://localhost:3001',
]

const RATE_LIMITS: Array<{ pattern: RegExp; limit: number; windowMs: number }> = [
  { pattern: /^\/api\/auth\/signup$/,  limit: 5,  windowMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/invite$/,        limit: 10, windowMs: 60 * 60 * 1000 },
  { pattern: /^\/api\/auth\/invite$/,  limit: 10, windowMs: 60 * 60 * 1000 },
  { pattern: /^\/api\/comments$/,      limit: 30, windowMs: 60 * 1000       },
  { pattern: /^\/api\/studies$/,       limit: 20, windowMs: 60 * 1000       },
]

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin') ?? ''

  // ── CORS + Rate limiting sur les routes API ──────────────────────
  if (pathname.startsWith('/api/')) {
    const isAllowedOrigin = !origin || ALLOWED_ORIGINS.includes(origin)
    if (!isAllowedOrigin) {
      return new NextResponse(null, { status: 403 })
    }

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

    const ip = getClientIp(request)
    for (const rule of RATE_LIMITS) {
      if (rule.pattern.test(pathname)) {
        if (!rateLimit(`${pathname}:${ip}`, rule.limit, rule.windowMs)) {
          return NextResponse.json(
            { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
            { status: 429, headers: rateLimitHeaders(rule.windowMs) },
          )
        }
        break
      }
    }
  }

  // ── Session Supabase ─────────────────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            })
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (user && pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', user.id)
      .single()

    if (profile?.is_suspended) {
      return NextResponse.redirect(new URL('/auth/suspended', request.url))
    }

    const role = profile?.role
    const path = pathname

    if (!role) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    if (path.startsWith('/dashboard/admin') && role !== 'admin') {
      if (role === 'client') {
        return NextResponse.redirect(new URL('/dashboard/client', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard/agent', request.url))
    }

    if (role === 'admin' && path.startsWith('/dashboard/agent')) {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url))
    }

    if (role === 'admin' && path.startsWith('/dashboard/client')) {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url))
    }
  }

  if (user && pathname === '/auth/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url))
    }
    if (role === 'agent') {
      return NextResponse.redirect(new URL('/dashboard/agent', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard/client', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
