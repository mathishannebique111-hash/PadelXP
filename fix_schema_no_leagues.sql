-- ============================================
-- CORRECTION DU SCHÉMA POUR SUPPRIMER LES LIGUES
-- ============================================
-- Exécute ce script dans Supabase SQL Editor pour rendre l'application opérationnelle sans ligues

-- 1. RENDRE league_id NULLABLE DANS matches
-- ============================================
ALTER TABLE public.matches
ALTER COLUMN league_id DROP NOT NULL;

-- Optionnel: définir une valeur par défaut NULL (au cas où)
ALTER TABLE public.matches
ALTER COLUMN league_id SET DEFAULT NULL;

-- 2. RLS POLICIES POUR matches
-- ============================================
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Nettoyage des anciennes policies si elles existent
DROP POLICY IF EXISTS matches_select_all_auth ON public.matches;
DROP POLICY IF EXISTS matches_insert_auth ON public.matches;
DROP POLICY IF EXISTS matches_update_auth ON public.matches;

-- Lecture: tous les utilisateurs authentifiés peuvent lire les matches
CREATE POLICY matches_select_all_auth
ON public.matches
FOR SELECT
USING (auth.role() = 'authenticated');

-- Insertion: tout utilisateur authentifié peut créer un match
CREATE POLICY matches_insert_auth
ON public.matches
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Mise à jour: tout utilisateur authentifié peut modifier un match (ajuste selon tes règles métier)
CREATE POLICY matches_update_auth
ON public.matches
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 3. RLS POLICIES POUR match_participants
-- ============================================
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mp_select_all_auth ON public.match_participants;
DROP POLICY IF EXISTS mp_insert_auth ON public.match_participants;
DROP POLICY IF EXISTS mp_update_auth ON public.match_participants;

-- Lecture: tous les utilisateurs authentifiés
CREATE POLICY mp_select_all_auth
ON public.match_participants
FOR SELECT
USING (auth.role() = 'authenticated');

-- Insertion: tout utilisateur authentifié
CREATE POLICY mp_insert_auth
ON public.match_participants
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Mise à jour: tout utilisateur authentifié
CREATE POLICY mp_update_auth
ON public.match_participants
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 4. VÉRIFICATION
-- ============================================
-- Vérifie que league_id est bien nullable
SELECT 
  column_name, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'matches' 
  AND column_name = 'league_id';

-- Liste toutes les policies actives
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('matches', 'match_participants')
ORDER BY tablename, policyname;

