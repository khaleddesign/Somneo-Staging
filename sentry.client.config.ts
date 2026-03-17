import * as Sentry from '@sentry/nextjs'

// Only initialize when SENTRY_DSN is set (skipped in local dev by default)
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    // Capture 10% of sessions in prod, 100% in staging
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Capture 100% of replays for sessions with errors
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.05,
    integrations: [
      Sentry.replayIntegration({
        // Mask all text and inputs to protect PHI
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  })
}
