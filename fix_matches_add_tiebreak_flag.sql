-- Ajoute un indicateur pour les matchs décidés au tie-break
-- À exécuter dans l'éditeur SQL de Supabase

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS decided_by_tiebreak BOOLEAN NOT NULL DEFAULT false;

-- Index optionnel pour filtrer rapidement
CREATE INDEX IF NOT EXISTS idx_matches_decided_by_tiebreak ON public.matches(decided_by_tiebreak);


