'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface DeleteStudyButtonProps {
  studyId: string
  redirectUrl: string
}

export default function DeleteStudyButton({ studyId, redirectUrl }: DeleteStudyButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    try {
      setIsDeleting(true)
      setError(null)

      const res = await fetch(`/api/studies/${studyId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        let errorMsg = 'Une erreur est survenue lors de la suppression'
        try {
          const data = await res.json()
          if (data.error) errorMsg = data.error
        } catch {}
        throw new Error(errorMsg)
      }

      setOpen(false)
      // Redirect to the dashboard/studies list
      router.push(redirectUrl)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur inconnue est survenue')
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="flex items-center gap-2 font-heading">
          <Trash2 className="h-4 w-4" />
          Effacer le dossier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 font-display">
            <AlertCircle className="h-5 w-5" />
            Irreversible Deletion
          </DialogTitle>
          <DialogDescription className="font-body pt-2 text-gray-600">
            Are you sure you want to delete this study?
            <br /><br />
            This action will permanently delete:
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li>Du fichier complet (EDF / ZIP) des serveurs</li>
              <li>Du report d'analyse final (s'il existe)</li>
              <li>De l'historique complet des informations du patient</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting} className="font-heading">
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="font-heading min-w-[120px]">
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Oui, supprimer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
