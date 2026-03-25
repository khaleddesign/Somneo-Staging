/**
 * Pure utility — slices query results and computes the nextCursor.
 *
 * Strategy: the DB query fetches `limit + 1` rows.
 *   - If result.length > limit → there IS a next page → slice to limit, set nextCursor
 *   - If result.length <= limit → last page → nextCursor = null
 *
 * Usage in API route:
 *   const raw = await db.from('studies').order('submitted_at', desc).limit(limit + 1)
 *   const { items, nextCursor } = paginateResults(raw, limit, 'submitted_at')
 */

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * @param rows - Raw DB results (limit + 1 rows requested)
 * @param limit - Requested page size
 * @param cursorField - Name of the field to use as cursor (must be a string on T)
 */
export function paginateResults<T extends object>(
  rows: T[],
  limit: number,
  cursorField: keyof T,
): PaginatedResult<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor =
    hasMore && items.length > 0
      ? String(items[items.length - 1][cursorField])
      : null;

  return { items, nextCursor };
}
