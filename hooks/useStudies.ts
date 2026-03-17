"use client"
import { useCallback, useEffect, useState } from 'react'
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
 * Default limit: 100 (covers all active studies for most deployments).
 * Existing consumers are unaffected — they receive the same { studies, loading, error, refresh }.
 */
export function useStudies(limit = 100, scope?: 'mine' | 'institution'): UseStudiesResult {
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

  useEffect(() => {
    fetchPage(null, false)
  }, [fetchPage])

  const refresh = useCallback(() => fetchPage(null, false), [fetchPage])
  const loadMore = useCallback(() => {
    if (nextCursor) fetchPage(nextCursor, true)
  }, [fetchPage, nextCursor])

  return { studies, loading, error, nextCursor, refresh, loadMore }
}
