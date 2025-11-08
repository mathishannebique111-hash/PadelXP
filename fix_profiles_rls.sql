-- ============================================
-- FIX RLS POLICIES FOR PROFILES TABLE
-- ============================================
-- Ce script vérifie et ajuste les policies RLS pour permettre
-- aux utilisateurs de lire les profils des membres de leur club
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Vérifier que la table profiles existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'Table "public.profiles" does not exist.';
  END IF;
END $$;

-- 2. Activer RLS sur profiles si ce n'est pas déjà fait
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS profiles_select_same_club ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;

-- 4. Créer une policy pour permettre la lecture des profils du même club
-- Les utilisateurs peuvent lire les profils des membres de leur club
CREATE POLICY profiles_select_same_club
ON public.profiles
FOR SELECT
USING (
  -- L'utilisateur peut lire son propre profil
  id = auth.uid()
  OR
  -- L'utilisateur peut lire les profils des membres de son club
  (
    -- Si l'utilisateur a un club_id, il peut lire les profils avec le même club_id
    (SELECT club_id FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
    AND club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid())
  )
  OR
  (
    -- Si l'utilisateur a un club_slug, il peut lire les profils avec le même club_slug
    (SELECT club_slug FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
    AND club_slug = (SELECT club_slug FROM public.profiles WHERE id = auth.uid())
  )
);

-- 5. Créer une policy pour permettre la mise à jour de son propre profil
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 6. Créer une policy pour permettre l'insertion de son propre profil
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- 7. Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'RLS policies for profiles table have been updated.';
  RAISE NOTICE 'Users can now read profiles of members from their own club.';
END $$;
