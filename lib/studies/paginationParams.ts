/**
 * Pure utility — parses and validates cursor-based pagination query params.
 *
 * Usage in API route:
 *   const { limit, cursor } = parsePaginationParams(new URL(req.url).searchParams)
 */

export interface PaginationParams {
  /** Number of items to return (1–100, default 50) */
  limit: number;
  /** ISO string of the last item's cursor field from the previous page, or null for first page */
  cursor: string | null;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

export function parsePaginationParams(
  searchParams: URLSearchParams,
): PaginationParams {
  const rawLimit = searchParams.get("limit");
  const rawCursor = searchParams.get("cursor");

  let limit = DEFAULT_LIMIT;
  if (rawLimit !== null) {
    const parsed = parseInt(rawLimit, 10);
    if (!isNaN(parsed)) {
      limit = Math.min(Math.max(parsed, MIN_LIMIT), MAX_LIMIT);
    }
  }

  const cursor = rawCursor && rawCursor.trim() !== "" ? rawCursor.trim() : null;

  return { limit, cursor };
}
