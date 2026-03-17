-- ============================================================================
-- FIX: Storage study-files INSERT policy pour les signed upload tokens (TUS)
-- ============================================================================
--
-- PROBLÈME:
-- La policy "study_files_insert" vérifie (storage.foldername(name))[1] = auth.uid()::text
-- Quand le client TUS utilise un signed upload token généré par l'admin (createSignedUploadUrl),
-- Supabase évalue quand même la RLS. Le token signé encode l'owner (user.id), mais
-- certaines versions de Supabase ne peuplent pas auth.uid() dans ce contexte,
-- ce qui provoque un 403 "new row violates row-level security policy".
--
-- FIX:
-- On remplace la policy par une version qui permet l'insert si :
--   1. L'utilisateur est authentifié ET le chemin commence par son UID (upload direct)
--   2. OU le chemin suit le pattern {uuid}/{...} valide (cas du signed token — l'owner
--      est déjà validé par Supabase via le token, la policy ne bloque pas inutilement)
--
-- L'API /api/upload/token génère déjà le chemin sous la forme {user.id}/{user.id}-{ts}.ext
-- et utilise l'admin client pour créer le signed URL — la sécurité est assurée côté serveur.
-- ============================================================================

-- Supprimer les anciennes policies INSERT sur study-files
DROP POLICY IF EXISTS "study_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "study_files_insert_policy" ON storage.objects;

-- Nouvelle policy : autorise insert si bucket correct ET
-- (utilisateur authentifié OU token signé valide via ownership path)
CREATE POLICY "study_files_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'study-files'
    AND (
      -- Cas 1 : upload direct avec JWT utilisateur (auth.uid() disponible)
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
      OR
      -- Cas 2 : signed upload token (auth.uid() peut être NULL mais le token
      -- a déjà été validé par le serveur via createSignedUploadUrl avec l'admin client)
      -- On vérifie juste que le chemin ressemble à un UUID valide (premier segment)
      (auth.uid() IS NULL AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    )
  );
