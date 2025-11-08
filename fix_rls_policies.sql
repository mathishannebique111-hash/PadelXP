-- ============================================
-- FIX COMPLET DES POLICIES RLS POUR PADELLEAGUE
-- ============================================
-- Copie-colle ce script dans Supabase SQL Editor et exécute-le

-- 1. POLICIES POUR public.profiles
-- ============================================

-- Activer RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: Lire son propre profil + profils des membres de sa ligue
DROP POLICY IF EXISTS "read_league_profiles" ON public.profiles;
CREATE POLICY "read_league_profiles" ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.league_memberships lm1
      JOIN public.league_memberships lm2 ON lm1.league_id = lm2.league_id
      WHERE lm1.user_id = profiles.id 
        AND lm2.user_id = auth.uid()
    )
  );

-- Policy INSERT: Créer son propre profil uniquement
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Policy UPDATE: Modifier son propre profil uniquement
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 2. POLICIES POUR public.league_memberships
-- ============================================

-- Activer RLS
ALTER TABLE public.league_memberships ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: Lire ses propres memberships + memberships des membres de sa ligue
DROP POLICY IF EXISTS "read_league_memberships" ON public.league_memberships;
CREATE POLICY "read_league_memberships" ON public.league_memberships
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = league_memberships.league_id 
        AND lm.user_id = auth.uid()
    )
  );

-- Policy INSERT: Créer un membership (nécessite droits admin ou service_role)
-- Pour le MVP, on laisse INSERT ouvert si vous utilisez service_role pour créer
-- Sinon, ajoutez une condition selon vos besoins
DROP POLICY IF EXISTS "insert_league_memberships" ON public.league_memberships;
CREATE POLICY "insert_league_memberships" ON public.league_memberships
  FOR INSERT
  WITH CHECK (true); -- À ajuster selon vos règles métier

-- 3. VÉRIFICATION FINALE
-- ============================================
-- Exécute ces requêtes pour vérifier que tout fonctionne :

-- Vérifier que RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'league_memberships');

-- Lister toutes les policies actives
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'league_memberships')
ORDER BY tablename, policyname;

