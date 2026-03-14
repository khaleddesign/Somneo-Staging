import { NextResponse, type NextRequest } from 'next/server'

const isDev = process.env.NODE_ENV === 'development'

export function middleware(request: NextRequest) {
  // Generate a unique nonce per request for CSP script-src
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const csp = [
    "default-src 'self'",
    // nonce replaces unsafe-inline; unsafe-eval kept only in dev (HMR/webpack)
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://app.somnoventis.com`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  // Pass nonce to RSC via request header so layout.tsx can forward it
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // Set CSP on the response
  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    // Apply to all page routes; skip static assets and API routes
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
