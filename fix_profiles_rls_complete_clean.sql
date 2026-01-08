-- ============================================
-- FIX COMPLET ET DÉFINITIF - RLS POLICIES POUR PROFILES
-- SUPPRIME TOUTES LES POLITIQUES ET RECRÉE DES POLITIQUES SIMPLES
-- ============================================
-- Ce script supprime TOUTES les politiques existantes et en crée de nouvelles simples
-- pour éviter TOUTE récursion infinie
-- Copie-colle ce script dans Supabase SQL Editor et exécute-le

-- 1. Activer RLS sur profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. LISTER ET SUPPRIMER TOUTES LES POLITIQUES EXISTANTES
-- Cette section liste d'abord toutes les politiques existantes, puis les supprime
DO $$
DECLARE
    r RECORD;
    policy_list TEXT := '';
    policy_count INTEGER := 0;
BEGIN
    -- D'abord, lister toutes les politiques existantes
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'POLITIQUES EXISTANTES À SUPPRIMER:';
    RAISE NOTICE '========================================';
    
    FOR r IN 
        SELECT policyname, cmd
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
        ORDER BY policyname
    LOOP
        policy_count := policy_count + 1;
        RAISE NOTICE '%: % (commande: %)', policy_count, r.policyname, r.cmd;
        policy_list := policy_list || r.policyname || ', ';
    END LOOP;
    
    IF policy_count = 0 THEN
        RAISE NOTICE 'Aucune politique existante à supprimer.';
    ELSE
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Total: % politique(s) à supprimer', policy_count;
        RAISE NOTICE '========================================';
        RAISE NOTICE '';
        RAISE NOTICE 'Suppression en cours...';
    END IF;
    
    -- Maintenant, supprimer toutes les politiques
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
        RAISE NOTICE '✅ Policy supprimée: %', r.policyname;
    END LOOP;
    
    IF policy_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ Toutes les politiques existantes ont été supprimées';
    END IF;
END $$;

-- 3. SUPPRIMER TOUTES LES FONCTIONS QUI POURRAIENT CAUSER DES PROBLÈMES
DROP FUNCTION IF EXISTS public.get_user_club_id(UUID) CASCADE;

-- 4. CRÉER UNE POLITIQUE SELECT SIMPLE - UNIQUEMENT SON PROPRE PROFIL
-- AUCUNE sous-requête, AUCUNE fonction, juste une comparaison directe
CREATE POLICY "profiles_select_own_only"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- 5. CRÉER UNE POLITIQUE INSERT - UNIQUEMENT SON PROPRE PROFIL
CREATE POLICY "profiles_insert_own_only"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- 6. CRÉER UNE POLITIQUE UPDATE - UNIQUEMENT SON PROPRE PROFIL
CREATE POLICY "profiles_update_own_only"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 7. CRÉER UNE POLITIQUE DELETE - UNIQUEMENT SON PROPRE PROFIL
CREATE POLICY "profiles_delete_own_only"
ON public.profiles
FOR DELETE
USING (id = auth.uid());

-- 8. VÉRIFICATION : Lister toutes les politiques actives
DO $$
DECLARE
    r RECORD;
    policy_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'POLITIQUES ACTIVES SUR profiles:';
    RAISE NOTICE '========================================';
    
    FOR r IN 
        SELECT policyname, cmd, qual
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
        ORDER BY policyname
    LOOP
        policy_count := policy_count + 1;
        RAISE NOTICE 'Policy: % | Command: % | Condition: %', r.policyname, r.cmd, r.qual;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total: % politiques actives', policy_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Configuration terminée !';
    RAISE NOTICE '✅ Chaque utilisateur peut UNIQUEMENT lire/modifier son propre profil';
    RAISE NOTICE '✅ AUCUNE récursion possible - politiques simples sans sous-requêtes';
END $$;
