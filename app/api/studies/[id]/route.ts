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
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Obtenir le rôle de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    // 2. Vérifier les permissions et récupérer les infos de l'étude
    const { data: study, error: fetchError } = await supabase
      .from('studies')
      .select('id, client_id, file_path, report_path')
      .eq('id', id)
      .single()

    if (fetchError || !study) {
      return NextResponse.json({ error: 'Étude introuvable' }, { status: 404 })
    }

    // Seul le propriétaire ou un admin peut supprimer
    if (study.client_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Non autorisé à supprimer cette étude' }, { status: 403 })
    }

    // 3. Suppression physique des fichiers (Utilisation du client Admin pour outrepasser les RLS Storage au besoin)
    const adminSupabase = createAdminClient()

    // Supprimer le fichier source EDF
    if (study.file_path) {
      const { error: storageError1 } = await adminSupabase.storage
        .from('study-files')
        .remove([study.file_path])
      
      if (storageError1) {
        console.error('[DELETE Study] Erreur suppression fichier EDF:', storageError1)
        // On ne bloque pas la suppression SQL si le fichier n'est pas trouvé
      }
    }

    // Supprimer le rapport PDF
    if (study.report_path) {
      const { error: storageError2 } = await adminSupabase.storage
        .from('reports-files')
        .remove([study.report_path])
        
      if (storageError2) {
        console.error('[DELETE Study] Erreur suppression rapport PDF:', storageError2)
      }
    }

    // 4. Suppression de l'enregistrement SQL
    // Cela déclenchera automatiquement le trigger `trg_audit_study_deletion`
    const { error: deleteError } = await supabase
      .from('studies')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[DELETE Study] Erreur suppression SQL:', deleteError)
      return NextResponse.json({ error: 'Erreur lors de la suppression en base de données' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE Study] Erreur interne:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
