'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Agent {
  id: string
  full_name: string | null
  email: string
}

interface AdminReassignDialogProps {
  studyId: string
  currentAgentId: string | null
  agents: Agent[]
}

export default function AdminReassignDialog({
  studyId,
  currentAgentId,
  agents,
}: AdminReassignDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    currentAgentId || 'unassigned',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReassign() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/studies/reassign', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          study_id: studyId,
          assigned_agent_id: selectedAgentId === 'unassigned' ? null : selectedAgentId,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || 'Error lors de la réassignation')
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="border-teal text-teal hover:bg-teal/5"
        onClick={() => setOpen(true)}
      >
        Reassign à un autre agent
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Reassign study</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="font-heading">Agent</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.full_name || agent.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              className="w-full bg-teal text-white hover:bg-teal/90"
              disabled={loading}
              onClick={handleReassign}
            >
              {loading ? 'Reassigning...' : 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
