/**
 * Pure utility — builds the URL for /api/studies/list with pagination + scope params.
 * Extracted from useStudies hook to make URL construction independently testable.
 */

export interface StudiesUrlOptions {
  limit: number
  scope?: 'mine' | 'institution'
  cursor?: string | null
}

export function buildStudiesUrl(options: StudiesUrlOptions): string {
  const params = new URLSearchParams({ limit: String(options.limit) })
  if (options.scope) params.set('scope', options.scope)
  if (options.cursor) params.set('cursor', options.cursor)
  return `/api/studies/list?${params.toString()}`
}
