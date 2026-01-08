-- ============================================
-- FIX RLS POLICIES POUR PROFILES - VERSION ULTRA RESTRICTIVE
-- SÉCURITÉ MAXIMALE : Chaque joueur ne peut accéder QU'À son propre profil
-- ============================================
-- Ce script corrige le problème de récursion infinie dans les politiques RLS
-- SÉCURITÉ MAXIMALE : 
--   - SELECT (lecture) : Un joueur peut lire UNIQUEMENT son propre profil
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
-- SÉCURITÉ MAXIMALE : Un joueur peut lire UNIQUEMENT son propre profil
-- Pas de lecture des profils des autres membres du club
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- 4. Policy INSERT: Créer son propre profil uniquement
-- SÉCURITÉ : Impossible de créer un profil pour un autre utilisateur
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- 5. Policy UPDATE: Modifier son propre profil uniquement
-- SÉCURITÉ RENFORCÉE : Un joueur ne peut modifier QUE son propre profil
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())  -- Vérifie que c'est bien son profil avant la modification
WITH CHECK (id = auth.uid());  -- Vérifie que c'est bien son profil après la modification

-- 6. Policy DELETE: Supprimer son propre profil uniquement (si nécessaire)
-- SÉCURITÉ : Un joueur ne peut supprimer QUE son propre profil
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
ON public.profiles
FOR DELETE
USING (id = auth.uid());

-- 7. Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies corrigées - récursion infinie résolue';
  RAISE NOTICE '✅ SÉCURITÉ MAXIMALE : Les utilisateurs peuvent UNIQUEMENT accéder à leur propre profil';
  RAISE NOTICE '✅ SELECT (lecture) : RESTREINT à son propre profil uniquement';
  RAISE NOTICE '✅ UPDATE/INSERT/DELETE : RESTREINT à son propre profil uniquement';
  RAISE NOTICE '✅ L''authentification (connexion) est gérée par Supabase Auth (impossible de se connecter au compte d''un autre)';
END $$;
