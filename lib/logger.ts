/**
 * Structured logger with correlation_id for request tracing.
 *
 * Usage:
 *   const logger = createLogger(req.headers.get('X-Request-ID') ?? undefined)
 *   logger.info('Study fetched', { study_id: id, route: '/api/studies/list' })
 */

type Level = 'info' | 'warn' | 'error'
type Meta = Record<string, unknown>

export interface Logger {
  correlationId: string
  info(message: string, meta?: Meta): void
  warn(message: string, meta?: Meta): void
  error(message: string, meta?: Meta): void
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function emit(level: Level, correlationId: string, message: string, meta?: Meta): void {
  const entry = JSON.stringify({
    level,
    correlation_id: correlationId,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  })

  if (level === 'error') {
    console.error(entry)
  } else if (level === 'warn') {
    console.warn(entry)
  } else {
    console.log(entry)
  }
}

export function createLogger(correlationId?: string): Logger {
  const id = correlationId ?? uuidv4()

  return {
    correlationId: id,
    info: (message, meta) => emit('info', id, message, meta),
    warn: (message, meta) => emit('warn', id, message, meta),
    error: (message, meta) => emit('error', id, message, meta),
  }
}
