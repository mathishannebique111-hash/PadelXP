-- ============================================
-- FIX: Supprimer players_hash ou la créer si nécessaire
-- ============================================
-- Ce script corrige le problème de la colonne players_hash dans matches

-- Option 1: Si players_hash N'EXISTE PAS et que vous voulez la SUPPRIMER complètement
-- Décommentez cette section si vous voulez supprimer toute référence à players_hash

-- DROP INDEX IF EXISTS idx_matches_players_hash;
-- ALTER TABLE public.matches DROP COLUMN IF EXISTS players_hash;

-- Option 2: Si players_hash N'EXISTE PAS et que vous voulez la CRÉER
-- Décommentez cette section si vous voulez créer la colonne players_hash

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'matches' 
    AND column_name = 'players_hash'
  ) THEN
    ALTER TABLE public.matches 
    ADD COLUMN players_hash TEXT;
    
    RAISE NOTICE 'Colonne players_hash créée dans matches';
  ELSE
    RAISE NOTICE 'Colonne players_hash existe déjà dans matches';
  END IF;
END $$;

-- Créer l'index si nécessaire
CREATE INDEX IF NOT EXISTS idx_matches_players_hash ON public.matches(players_hash);

-- Vérifier le schéma actuel de matches
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'matches'
ORDER BY ordinal_position;

