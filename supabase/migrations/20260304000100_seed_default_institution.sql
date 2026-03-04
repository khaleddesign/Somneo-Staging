-- Insère une institution SOMNOVENTIS par défaut si aucune n'existe.
-- Corrige le bug POST /api/invite → 400 "Aucune institution disponible"
-- pour les admins sans institution_id.
INSERT INTO institutions (name)
SELECT 'SOMNOVENTIS'
WHERE NOT EXISTS (SELECT 1 FROM institutions LIMIT 1);

-- Met à jour les profils admin qui n'ont pas d'institution_id
UPDATE profiles
SET institution_id = (SELECT id FROM institutions LIMIT 1)
WHERE role = 'admin'
  AND institution_id IS NULL;
