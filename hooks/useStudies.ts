"use client"
import { useCallback, useEffect, useState } from 'react'

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
}

export function useStudies() {
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStudies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/studies/list')
      if (!res.ok) throw new Error('Erreur lors du chargement des études')
      const data = await res.json()
      setStudies(data.studies || [])
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors du chargement des études'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudies()
  }, [fetchStudies])

  const refresh = fetchStudies

  return { studies, loading, error, refresh }
}
