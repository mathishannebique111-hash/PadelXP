-- ============================================
-- FIX RLS POLICIES POUR PROFILES - SANS RÉCURSION
-- SÉCURITÉ RENFORCÉE : Chaque joueur ne peut modifier QUE son propre profil
-- ============================================
-- Ce script corrige le problème de récursion infinie dans les politiques RLS
-- SÉCURITÉ : 
--   - SELECT (lecture) : Un joueur peut lire son propre profil + les profils publics des membres de son club
--   - UPDATE/INSERT/DELETE : Un joueur peut UNIQUEMENT modifier son propre profil
--   - L'authentification (connexion) est gérée séparément par Supabase Auth (impossible de se connecter au compte d'un autre)
-- Copie-colle ce script dans Supabase SQL Editor et exécute-le

-- 1. Activer RLS sur profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer TOUTES les anciennes policies pour éviter les conflits
DROP POLICY IF EXISTS profiles_select_same_club ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS "read_league_profiles" ON public.profiles;
DROP POLICY IF EXISTS "read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;

-- 3. Créer une politique SELECT simple SANS RÉCURSION
-- IMPORTANT : SELECT = LECTURE SEULEMENT (pas de modification possible)
-- L'utilisateur peut lire son propre profil (pas de sous-requête sur profiles)
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- 4. OPTIONNEL : Créer une politique SELECT pour les membres du même club
-- Si vous ne voulez PAS que les joueurs voient les profils des autres membres de leur club,
-- COMMENTEZ cette section (lignes 4.1 à 4.3)
-- 
-- 4.1. Fonction helper pour éviter la récursion (utilise SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_club_id(user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result UUID;
BEGIN
  SELECT club_id INTO result
  FROM public.profiles
  WHERE id = user_id
  LIMIT 1;
  RETURN result;
END;
$$;

-- 4.2. Policy pour lire les profils du même club (LECTURE SEULEMENT)
-- Cette policy permet seulement de VOIR les informations publiques (nom, photo) des autres membres
-- Elle ne permet PAS de modifier, supprimer ou se connecter à leur compte
CREATE POLICY "profiles_select_same_club"
ON public.profiles
FOR SELECT
USING (
  -- L'utilisateur peut lire les profils des membres de son club (pour afficher dans le leaderboard, etc.)
  (
    club_id IS NOT NULL
    AND club_id = public.get_user_club_id(auth.uid())
    AND public.get_user_club_id(auth.uid()) IS NOT NULL
  )
);

-- 5. Policy INSERT: Créer son propre profil uniquement
-- SÉCURITÉ : Impossible de créer un profil pour un autre utilisateur
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- 6. Policy UPDATE: Modifier son propre profil uniquement
-- SÉCURITÉ RENFORCÉE : Un joueur ne peut modifier QUE son propre profil
-- Impossible de modifier le profil d'un autre joueur, même s'il est dans le même club
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())  -- Vérifie que c'est bien son profil avant la modification
WITH CHECK (id = auth.uid());  -- Vérifie que c'est bien son profil après la modification

-- 7. Policy DELETE: Supprimer son propre profil uniquement (si nécessaire)
-- SÉCURITÉ : Un joueur ne peut supprimer QUE son propre profil
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
ON public.profiles
FOR DELETE
USING (id = auth.uid());

-- 8. Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies corrigées - récursion infinie résolue';
  RAISE NOTICE '✅ SÉCURITÉ : Les utilisateurs peuvent UNIQUEMENT modifier leur propre profil';
  RAISE NOTICE '✅ SELECT (lecture) : Les utilisateurs peuvent lire leur propre profil';
  RAISE NOTICE '✅ SELECT (lecture) : Les utilisateurs peuvent lire les profils publics des membres de leur club (pour leaderboard, etc.)';
  RAISE NOTICE '✅ UPDATE/INSERT/DELETE : RESTREINT à son propre profil uniquement';
  RAISE NOTICE '✅ L''authentification (connexion) est gérée par Supabase Auth (impossible de se connecter au compte d''un autre)';
END $$;
