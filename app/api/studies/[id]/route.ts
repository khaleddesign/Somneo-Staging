import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 1. Authentifier l'utilisateur
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    // 2. Verify permissions and retrieve study info
    const { data: study, error: fetchError } = await supabase
      .from('studies')
      .select('id, client_id, file_path, report_path, status')
      .eq('id', id)
      .single()

    if (fetchError || !study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 })
    }

    // Only the owner or an admin can delete
    if (study.client_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to delete this study' }, { status: 403 })
    }

    // 🔒 Sécurité : un client ne peut pas supprimer une étude en cours ou terminée
    // Seul un admin peut supprimer un dossier actif
    if (['en_cours', 'termine'].includes(study.status) && !isAdmin) {
      return NextResponse.json(
        { error: 'Impossible de supprimer une étude en cours ou terminée. Contactez un administrateur.' },
        { status: 403 }
      )
    }

    // 3. Suppression physique des fichiers (Utilisation du client Admin pour outrepasser les RLS Storage au besoin)
    const adminSupabase = createAdminClient()

    // Supprimer le fichier source EDF
    if (study.file_path) {
      const { error: storageError1 } = await adminSupabase.storage
        .from('study-files')
        .remove([study.file_path])
      
      if (storageError1) {
        console.error('[DELETE Study] Error suppression fichier EDF:', storageError1)
        // Don't block SQL deletion if file is not found
      }
    }

    // Supprimer le report PDF
    if (study.report_path) {
      const { error: storageError2 } = await adminSupabase.storage
        .from('reports-files')
        .remove([study.report_path])
        
      if (storageError2) {
        console.error('[DELETE Study] Error suppression report PDF:', storageError2)
      }
    }

    // 4. Suppression de l'enregistrement SQL
    // This will automatically trigger `trg_audit_study_deletion`
    const { error: deleteError } = await supabase
      .from('studies')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[DELETE Study] Error suppression SQL:', deleteError)
      return NextResponse.json({ error: 'Error deleting from database' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE Study] Error interne:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
