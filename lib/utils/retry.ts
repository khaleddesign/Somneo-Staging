/**
 * Exponential backoff retry utility.
 *
 * Retries a function on server errors (5xx) or network errors.
 * Does NOT retry on client errors (4xx) — those indicate caller bugs.
 *
 * Usage:
 *   const data = await retryWithBackoff(
 *     () => fetch('/api/upload/token', { method: 'POST', body }),
 *     { maxAttempts: 3, baseDelayMs: 1000 }
 *   )
 */

interface RetryOptions {
  /** Total number of attempts (including the first one). Min: 1 */
  maxAttempts: number;
  /** Base delay in milliseconds — doubles on each retry */
  baseDelayMs: number;
  /**
   * Injectable sleep function for testing.
   * Defaults to a real setTimeout-based delay in production.
   */
  _sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Returns true if the error is a client error (4xx) that should NOT be retried.
 */
function isClientError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return typeof status === "number" && status >= 400 && status < 500;
}

/**
 * Retries `fn` up to `maxAttempts` times with exponential backoff.
 *
 * @throws The last error if all attempts fail.
 * @throws Immediately on 4xx errors (no retry).
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxAttempts, baseDelayMs, _sleep = defaultSleep } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      // Client errors (4xx): immediate rethrow, no retry
      if (isClientError(err)) throw err;

      lastError = err;

      // If this was the last attempt, stop
      if (attempt >= maxAttempts - 1) break;

      // Exponential backoff: baseDelayMs * 2^attempt
      const delay = baseDelayMs * Math.pow(2, attempt);
      await _sleep(delay);
    }
  }

  throw lastError;
}
