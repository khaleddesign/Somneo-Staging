"use client"
import { useCallback, useEffect, useRef, useState } from 'react'
import { buildStudiesUrl } from '@/lib/studies/studiesUrlBuilder'

export interface Study {
  id: string
  client_id: string
  assigned_agent_id: string | null
  patient_reference: string
  study_type: 'PSG' | 'PV'
  priority: 'low' | 'medium' | 'high'
  status: 'en_attente' | 'en_cours' | 'termine' | 'annule'
  submitted_at: string
  archived_at?: string | null
  // Optionnel pour agent :
  client_name?: string
  client_email?: string
  // Forward-compat for Batch 3:
  result_date?: string | null
  delay_days?: number | null
  is_stale?: boolean
}

export interface UseStudiesResult {
  studies: Study[]
  loading: boolean
  error: string | null
  /** Cursor for the next page, null if on the last page */
  nextCursor: string | null
  /** Reload the current page from scratch */
  refresh: () => void
  /** Fetch and append the next page (infinite scroll) */
  loadMore: () => void
}

/**
 * Fetches studies from /api/studies/list with cursor-based pagination.
 *
 * Pass fetchAll=true to automatically load all pages in sequence (agent dashboard use case).
 * Each page uses the configured limit (max 500 per API call).
 */
export function useStudies(
  limit = 100,
  scope?: 'mine' | 'institution',
  fetchAll = false,
): UseStudiesResult {
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const url = buildStudiesUrl({ limit, scope, cursor })

        const res = await fetch(url)
        if (!res.ok) throw new Error('Erreur lors du chargement des études')

        const data = await res.json()
        const incoming: Study[] = data.studies || []

        setStudies((prev) => (append ? [...prev, ...incoming] : incoming))
        setNextCursor(data.nextCursor ?? null)
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Erreur lors du chargement des études'
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [limit, scope]
  )

  // Auto-load all pages when fetchAll=true, sequentially following cursors.
  const fetchAllPages = useCallback(async () => {
    setLoading(true)
    setError(null)
    const all: Study[] = []
    let cursor: string | null = null
    try {
      do {
        const url = buildStudiesUrl({ limit, scope, cursor })
        const res = await fetch(url)
        if (!res.ok) throw new Error('Erreur lors du chargement des études')
        const data = await res.json()
        all.push(...(data.studies ?? []))
        cursor = data.nextCursor ?? null
      } while (cursor)
      setStudies(all)
      setNextCursor(null)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors du chargement des études'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [limit, scope])

  // Keep a stable ref so the effect doesn't re-run when callbacks change identity.
  const fetchAllRef = useRef(fetchAllPages)
  fetchAllRef.current = fetchAllPages
  const fetchPageRef = useRef(fetchPage)
  fetchPageRef.current = fetchPage

  useEffect(() => {
    if (fetchAll) {
      fetchAllRef.current()
    } else {
      fetchPageRef.current(null, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAll])

  const refresh = useCallback(() => {
    if (fetchAll) fetchAllPages()
    else fetchPage(null, false)
  }, [fetchAll, fetchAllPages, fetchPage])

  const loadMore = useCallback(() => {
    if (nextCursor) fetchPage(nextCursor, true)
  }, [fetchPage, nextCursor])

  return { studies, loading, error, nextCursor, refresh, loadMore }
}
