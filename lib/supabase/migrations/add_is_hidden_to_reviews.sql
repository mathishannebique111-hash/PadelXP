-- ============================================
-- MIGRATION: Ajouter la colonne is_hidden à la table reviews
-- ============================================
-- Ce script ajoute la colonne is_hidden à la table reviews si elle n'existe pas déjà
-- Cette colonne permet de masquer les avis qui ne doivent pas être affichés sur le site
-- (par exemple, les avis avec 3 étoiles ou moins et 6 mots ou moins dans le commentaire)

-- Ajouter la colonne is_hidden si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reviews' 
    AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE public.reviews ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE NOT NULL;
    
    -- Mettre à jour toutes les lignes existantes pour avoir is_hidden = false par défaut
    UPDATE public.reviews SET is_hidden = FALSE WHERE is_hidden IS NULL;
    
    -- Ajouter un index pour améliorer les performances des requêtes de filtrage
    CREATE INDEX IF NOT EXISTS reviews_is_hidden_idx ON public.reviews(is_hidden) WHERE is_hidden = FALSE;
    
    RAISE NOTICE '✅ Colonne is_hidden ajoutée à la table reviews';
  ELSE
    RAISE NOTICE 'ℹ️ La colonne is_hidden existe déjà dans la table reviews';
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
  AND table_name = 'reviews' 
  AND column_name = 'is_hidden';

