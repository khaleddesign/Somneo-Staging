import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin'
import { withSentryConfig } from '@sentry/nextjs'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const SUPABASE_HOST = "wzvvdbbdnlhjqpydqvur.supabase.co";

const csp = [
  "default-src 'self'",
  // Next.js App Router requires unsafe-inline for hydration scripts.
  // unsafe-eval only included in dev for Turbopack hot-reload.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://*.sentry.io`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control",      value: "on" },
  { key: "Strict-Transport-Security",    value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options",              value: "DENY" },
  { key: "X-Content-Type-Options",       value: "nosniff" },
  { key: "Referrer-Policy",              value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",           value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy",      value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

const intlConfig = withNextIntl(nextConfig)

export default withSentryConfig(intlConfig, {
  // Sentry org/project — set via SENTRY_ORG and SENTRY_PROJECT env vars
  silent: true,           // suppress CLI output in CI
  // Only upload source maps when DSN is configured (avoids build failures in local dev)
  sourcemaps: {
    disable: !process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
  // Disable Sentry build-time features if no auth token is set
  authToken: process.env.SENTRY_AUTH_TOKEN,
})
