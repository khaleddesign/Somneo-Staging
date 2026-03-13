-- Migration pour traquer les suppressions d'études dans audit_logs
-- Fichier: 20260313_audit_deletions.sql

-- 1. Fonction Trigger pour enregistrer la suppression
CREATE OR REPLACE FUNCTION public.log_study_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Exécuté avec les privilèges du propriétaire pour bypasser RLS
AS $$
BEGIN
  -- Insertion dans audit_logs
  -- auth.uid() fonctionne si la suppression vient de l'API via le client authentifié
  -- Si suppression via psql/dashboard admin direct, le user_id sera NULL, mais l'audit aura lieu
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    auth.uid(),
    'delete_study',
    'study',
    OLD.id,
    jsonb_build_object(
      'patient_reference', OLD.patient_reference,
      'client_id', OLD.client_id,
      'status', OLD.status,
      'deleted_via_trigger', true
    )
  );
  
  RETURN OLD;
END;
$$;

-- 2. Création du Trigger sur la table studies
DROP TRIGGER IF EXISTS trg_audit_study_deletion ON public.studies;
CREATE TRIGGER trg_audit_study_deletion
AFTER DELETE ON public.studies
FOR EACH ROW
EXECUTE FUNCTION public.log_study_deletion();
