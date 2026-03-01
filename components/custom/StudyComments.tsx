"use client"

import { useEffect, useRef, useState } from 'react'
import { useComments } from '@/hooks/useComments'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Send } from 'lucide-react'

interface StudyCommentsProps {
  studyId: string
  currentUser: {
    id: string
    name?: string | null
  }
}

export default function StudyComments({ studyId, currentUser }: StudyCommentsProps) {
  const { comments, loading, sending, error, sendComment } = useComments(studyId)
  const [text, setText] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // scroll to bottom when comments change
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
    } catch {
      // error already handled by hook
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Discussion</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-80">
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto space-y-4 px-2 py-1"
        >
          {loading && <p className="text-sm text-gray-500">Chargement...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && comments.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-400">Aucun message pour cette étude. Démarrez la conversation.</p>
            </div>
          )}
          {comments.map((c) => {
            const mine = c.user_id === currentUser.id
            return (
              <div
                key={c.id}
                className={`flex items-end ${mine ? 'justify-end' : 'justify-start'}`}
              >
                {!mine && (
                  <Avatar name={c.profiles.full_name} className="mr-2" />
                )}
                <div
                  className={`p-2 rounded-lg max-w-[70%] break-words ${
                    mine
                      ? 'bg-[#1ec8d4] text-[#f0e8d6]'
                      : 'bg-gray-100 text-[#06111f]'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{c.message}</div>
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {formatTime(c.created_at)}
                  </div>
                </div>
                {mine && (
                  <Avatar
                    name={currentUser.name || 'Vous'}
                    className="ml-2"
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* input area */}
        <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrivez votre message..."
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={sending || !text.trim()}
            className="bg-[#06111f] text-white hover:bg-[#1a2230] p-2"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
