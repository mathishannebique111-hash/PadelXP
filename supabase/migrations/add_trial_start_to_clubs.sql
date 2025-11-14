-- ============================================
-- ADD TRIAL_START COLUMN TO CLUBS TABLE
-- ============================================
-- Ajoute la colonne trial_start pour suivre le début de l'essai gratuit de 30 jours

-- Ajouter la colonne trial_start si elle n'existe pas
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

-- Pour tous les clubs existants qui n'ont pas de trial_start, initialiser avec created_at
UPDATE public.clubs
SET trial_start = COALESCE(trial_start, created_at, NOW())
WHERE trial_start IS NULL;

-- Index pour améliorer les performances des requêtes sur trial_start
CREATE INDEX IF NOT EXISTS idx_clubs_trial_start ON public.clubs(trial_start);

