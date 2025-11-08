-- ============================================
-- FIX RLS POLICIES FOR CLUBS TABLE
-- ============================================
-- Ce script permet la lecture publique de la table clubs
-- pour que les joueurs puissent voir la liste des clubs disponibles
-- Exécutez ce script dans Supabase SQL Editor
-- IMPORTANT: Exécutez d'abord create_clubs_table.sql si la table n'existe pas

-- 1. Vérifier que la table existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'clubs'
  ) THEN
    RAISE EXCEPTION 'Table "public.clubs" does not exist. Please run create_clubs_table.sql first.';
  END IF;
END $$;

-- 2. Activer RLS sur la table clubs si ce n'est pas déjà fait
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS clubs_select_public ON public.clubs;
DROP POLICY IF EXISTS clubs_select_all ON public.clubs;

-- 4. Créer une policy qui permet la lecture publique (SELECT) pour tous
-- Les joueurs ont besoin de voir la liste des clubs pour s'inscrire
CREATE POLICY clubs_select_public
ON public.clubs
FOR SELECT
USING (true); -- Permet à tout le monde de lire les clubs

-- 5. Optionnel : Créer une policy pour permettre l'insertion uniquement aux admins
-- (à adapter selon vos besoins)
-- CREATE POLICY clubs_insert_admin
-- ON public.clubs
-- FOR INSERT
-- WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- 6. Vérifier que la table existe et a les bonnes colonnes
DO $$
BEGIN
  -- Vérifier si la colonne 'name' existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clubs' 
    AND column_name = 'name'
  ) THEN
    RAISE NOTICE 'Column "name" does not exist in clubs table. Please add it.';
  END IF;
  
  -- Vérifier si la colonne 'slug' existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clubs' 
    AND column_name = 'slug'
  ) THEN
    RAISE NOTICE 'Column "slug" does not exist in clubs table. Please add it.';
  END IF;
  
  -- Vérifier si la colonne 'code_invitation' existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clubs' 
    AND column_name = 'code_invitation'
  ) THEN
    RAISE NOTICE 'Column "code_invitation" does not exist in clubs table. Please add it.';
  END IF;
END $$;

-- 7. Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'RLS policies for clubs table have been updated. Public SELECT is now allowed.';
END $$;

