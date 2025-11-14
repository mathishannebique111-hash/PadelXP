-- ============================================
-- AJOUTER LA COLONNE logo_url À LA TABLE clubs
-- ============================================
-- Ce script ajoute la colonne logo_url à la table clubs si elle n'existe pas

-- Ajouter la colonne logo_url si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'clubs' 
    AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.clubs
    ADD COLUMN logo_url TEXT;
    
    RAISE NOTICE '✅ Colonne logo_url ajoutée à la table clubs';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne logo_url existe déjà dans la table clubs';
  END IF;
END $$;

-- Vérifier le schéma actuel de clubs
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'clubs'
  AND column_name IN ('id', 'name', 'slug', 'logo_url')
ORDER BY ordinal_position;

