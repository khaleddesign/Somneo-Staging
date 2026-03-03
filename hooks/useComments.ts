"use client"
import { useCallback, useEffect, useState, useRef } from 'react'

export interface Comment {
  id: string
  study_id: string
  user_id: string
  message: string
  created_at: string
  profiles: {
    full_name: string
    role: string
  } | null
}

export function useComments(studyId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchComments = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`/api/comments?study_id=${studyId}`)
      if (!res.ok) throw new Error('Erreur lors du chargement des commentaires')
      const data = await res.json()
      setComments(data.comments || [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [studyId])

  const sendComment = useCallback(
    async (message: string) => {
      setSending(true)
      setError(null)
      try {
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ study_id: studyId, message }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'envoi')
        // add new comment locally and scroll by consumer effect
        setComments((prev) => [...prev, data.comment])
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        throw e
      } finally {
        setSending(false)
      }
    },
    [studyId]
  )

  useEffect(() => {
    fetchComments()
    // polling every 30s
    pollingRef.current = setInterval(fetchComments, 30000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current as unknown as number)
    }
  }, [fetchComments])

  return { comments, loading, sending, error, fetchComments, sendComment }
}
