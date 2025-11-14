-- ============================================
-- BACKFILL TRIAL_START FOR EXISTING CLUBS
-- ============================================
-- Met à jour trial_start pour tous les clubs existants qui n'ont pas encore cette valeur
-- Utilise created_at comme date de début d'essai pour les clubs existants

-- S'assurer que la colonne trial_start existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clubs' AND column_name = 'trial_start'
  ) THEN
    ALTER TABLE public.clubs 
    ADD COLUMN trial_start TIMESTAMPTZ;
  END IF;
END $$;

-- Mettre à jour tous les clubs qui n'ont pas de trial_start
-- Utilise created_at comme date de début d'essai pour les clubs existants
-- Si created_at n'existe pas, utilise la date actuelle (nouveau club)
UPDATE public.clubs
SET trial_start = COALESCE(
  trial_start,  -- Garder la valeur existante si elle existe
  created_at,   -- Utiliser created_at pour les clubs existants
  NOW()         -- Fallback : date actuelle (ne devrait jamais arriver)
)
WHERE trial_start IS NULL;

-- Vérification : afficher les clubs mis à jour
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.clubs
  WHERE trial_start IS NOT NULL;
  
  RAISE NOTICE '✅ Migration terminée : % clubs ont leur trial_start défini', updated_count;
END $$;

