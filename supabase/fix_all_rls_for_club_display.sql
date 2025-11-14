-- ============================================
-- FIX COMPLET: Corriger toutes les politiques RLS pour afficher le club
-- ============================================
-- Ce script corrige TOUS les problèmes potentiels de RLS

-- 1. CLUBS TABLE - Permettre la lecture publique
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les policies existantes sur clubs
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'clubs' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.clubs';
    END LOOP;
END $$;

-- Créer UNE SEULE policy qui permet TOUT LE MONDE de lire les clubs
CREATE POLICY "clubs_allow_all_read"
ON public.clubs
FOR SELECT
TO public
USING (true);

DO $$
BEGIN
    RAISE NOTICE '✅ Politique RLS sur clubs mise à jour: lecture publique pour tous';
END $$;

-- 2. CLUB_ADMINS TABLE - Permettre aux utilisateurs de voir leur propre statut
ALTER TABLE public.club_admins ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes qui pourraient être circulaires
DROP POLICY IF EXISTS "Admins can view their club admins" ON public.club_admins;
DROP POLICY IF EXISTS "Users can view own admin status" ON public.club_admins;

-- Créer deux policies claires
CREATE POLICY "club_admins_view_own"
ON public.club_admins
FOR SELECT
TO public
USING (user_id = auth.uid());

CREATE POLICY "club_admins_view_club"
ON public.club_admins  
FOR SELECT
TO public
USING (
  club_id IN (
    SELECT club_id FROM public.club_admins WHERE user_id = auth.uid()
  )
);

DO $$
BEGIN
    RAISE NOTICE '✅ Politiques RLS sur club_admins mises à jour: lecture de son propre statut + autres admins du club';
END $$;

-- 3. PROFILES TABLE - S'assurer que les profils sont lisibles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Vérifier qu'il existe au moins une policy de lecture
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND schemaname = 'public'
        AND cmd = 'SELECT'
    ) THEN
        CREATE POLICY "profiles_allow_read"
        ON public.profiles
        FOR SELECT
        TO public
        USING (true);
        RAISE NOTICE '✅ Policy de lecture créée sur profiles';
    ELSE
        RAISE NOTICE 'ℹ️  Policies de lecture déjà présentes sur profiles';
    END IF;
END $$;

-- 4. DIAGNOSTIC FINAL
DO $$
DECLARE
    club_count INTEGER;
    tcam_club RECORD;
BEGIN
    -- Compter les clubs
    SELECT COUNT(*) INTO club_count FROM public.clubs;
    RAISE NOTICE 'ℹ️  Nombre total de clubs: %', club_count;
    
    -- Vérifier si TCAM existe
    SELECT id, name, slug, logo_url INTO tcam_club 
    FROM public.clubs 
    WHERE slug ILIKE '%tcam%' OR name ILIKE '%tcam%'
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE '✅ Club TCAM trouvé:';
        RAISE NOTICE '   - ID: %', tcam_club.id;
        RAISE NOTICE '   - Nom: %', tcam_club.name;
        RAISE NOTICE '   - Slug: %', tcam_club.slug;
        RAISE NOTICE '   - Logo: %', CASE WHEN tcam_club.logo_url IS NOT NULL THEN 'Présent' ELSE 'MANQUANT' END;
    ELSE
        RAISE NOTICE '❌ Aucun club TCAM trouvé dans la base de données';
    END IF;
END $$;

-- 5. Afficher un résumé des policies actives
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== POLICIES ACTIVES ===';
END $$;

SELECT 
    tablename,
    policyname,
    cmd,
    CASE WHEN qual IS NULL THEN 'Aucune restriction' ELSE 'Avec restrictions' END as restrictions
FROM pg_policies
WHERE tablename IN ('clubs', 'club_admins', 'profiles')
AND schemaname = 'public'
ORDER BY tablename, policyname;

