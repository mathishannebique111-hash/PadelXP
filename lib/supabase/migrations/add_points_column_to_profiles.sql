-- ============================================
-- MIGRATION: Ajouter la colonne points à la table profiles
-- ============================================
-- Ce script ajoute la colonne points à la table profiles si elle n'existe pas déjà
-- Cette colonne est utilisée pour stocker les points de challenges et autres bonus
-- (comme les 10 points pour le premier avis)

-- Ajouter la colonne points si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'points'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN points INTEGER DEFAULT 0;
    
    -- Mettre à jour toutes les lignes existantes pour avoir 0 points par défaut
    UPDATE public.profiles SET points = 0 WHERE points IS NULL;
    
    RAISE NOTICE '✅ Colonne points ajoutée à la table profiles';
  ELSE
    RAISE NOTICE 'ℹ️ La colonne points existe déjà dans la table profiles';
  END IF;
  
  -- Vérifier et ajouter la contrainte de non-négativité si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND constraint_name = 'profiles_points_non_negative'
  ) THEN
    -- Supprimer la contrainte si elle existe déjà avec un nom différent
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_points_non_negative;
    
    -- Ajouter la contrainte pour s'assurer que les points ne sont pas négatifs
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_points_non_negative 
      CHECK (points >= 0);
    
    RAISE NOTICE '✅ Contrainte profiles_points_non_negative ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️ La contrainte profiles_points_non_negative existe déjà';
  END IF;
END $$;

-- Vérifier que la colonne existe maintenant
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'points';

