"use client"
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useComments, Comment } from '@/hooks/useComments'
import { Button } from '@/components/ui/button'

interface CommentThreadProps {
  studyId: string
}

export default function CommentThread({ studyId }: CommentThreadProps) {
  const { comments, loading, sending, error, sendComment } = useComments(studyId)
  const [text, setText] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // scroll bottom when comments change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [comments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const msg = text.trim()
    if (!msg) return
    try {
      await sendComment(msg)
      setText('')
    } catch (e) {
      // error already set in hook
    }
  }

  const renderRoleBadge = (role: string) => {
    const isAgent = role === 'agent' || role === 'admin'
    const color = isAgent ? 'bg-teal-100 text-teal-800' : 'bg-gray-200 text-gray-800'
    const label = isAgent ? 'Agent' : 'Client'
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded ${color}`}>{label}</span>
    )
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h2 className="text-lg font-semibold mb-4">Discussion</h2>
      <div
        ref={containerRef}
        className="space-y-4 h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {loading && <p className="text-sm text-gray-500">Chargement...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {comments.map((c) => {
          const mine = c.user_id === userId
          return (
            <div key={c.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`p-2 rounded-lg max-w-[75%] ${
                  mine ? 'bg-blue-100 text-right' : 'bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{c.profiles.full_name}</span>
                  {renderRoleBadge(c.profiles.role)}
                </div>
                <div className="text-sm whitespace-pre-wrap">{c.message}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(c.created_at).toLocaleString('fr-FR')}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="border rounded p-2 mb-2 resize-none"
          placeholder="Écrire un message..."
        />
        <Button type="submit" disabled={sending || !text.trim()}>
          {sending ? 'Envoi...' : 'Envoyer'}
        </Button>
      </form>
    </div>
  )
}
