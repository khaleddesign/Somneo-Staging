-- ============================================================================
-- FIX: Security Warning for safe_invitations View
-- ============================================================================
--
-- PROBLÈME:
-- Supabase signale que la vue `public.safe_invitations` utilise SECURITY DEFINER
-- par défaut, ce qui contourne le RLS normal et s'exécute avec les privilèges
-- du créateur (le rôle admin/postgres).
--
-- FIX:
-- On ajoute `WITH (security_invoker = on)` à la vue pour qu'elle respecte les
-- permissions de l'utilisateur qui l'interroge, sécurisant ainsi l'accès.
-- ============================================================================

-- On recrée la vue avec security_invoker = true
CREATE OR REPLACE VIEW public.safe_invitations 
WITH (security_invoker = true) AS 
SELECT 
    id, 
    email, 
    role_invited, 
    created_by, 
    institution_id, 
    expires_at, 
    used_at, 
    created_at 
FROM public.invitations;
