import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const isDev = process.env.NODE_ENV === 'development'

export async function middleware(request: NextRequest) {
  // Generate a unique nonce per request for CSP script-src
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://app.somnoventis.com`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  // Inject nonce into request headers so RSC can read it via headers()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // updateSession handles: cookie refresh, auth redirect, suspended user check
  const response = await updateSession(
    new Request(request, { headers: requestHeaders }) as NextRequest
  )

  // Attach CSP to whatever response updateSession returns (redirect or next)
  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
