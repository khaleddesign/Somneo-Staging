/**
 * Pure utility functions for agent dashboard study metrics.
 * Zero external dependencies — fully testable with Vitest.
 */

/**
 * Compute the number of days between study submission and results upload.
 * Returns null if the study has no result yet.
 */
export function computeDelayDays(
  submittedAt: string,
  resultDate: string | null | undefined,
): number | null {
  if (!resultDate) return null;
  const diffMs = Math.abs(
    new Date(resultDate).getTime() - new Date(submittedAt).getTime(),
  );
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns true if the study is "en_cours" and hasn't been updated
 * for longer than thresholdHours (default: 48h).
 */
export function isStale(
  updatedAt: string,
  status: string,
  thresholdHours = 48,
): boolean {
  if (status !== "en_cours") return false;
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  return ageMs > thresholdHours * 3_600_000;
}
