-- ============================================
-- FIX: Permettre la mise à jour de theme_preference
-- ============================================
-- Copie-colle ce script dans Supabase SQL Editor et exécute-le
-- Ce script garantit que la colonne existe et que les policies RLS permettent sa mise à jour

-- 1. Ajouter la colonne theme_preference si elle n'existe pas
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light'));

-- 2. Commentaire
COMMENT ON COLUMN profiles.theme_preference IS 'Préférence de thème utilisateur: dark (par défaut) ou light';

-- 3. S'assurer que RLS est activé
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Vérifier les policies UPDATE existantes
DO $$
DECLARE
  update_policy_exists BOOLEAN;
BEGIN
  -- Vérifier si une policy UPDATE existe
  SELECT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND cmd = 'UPDATE'
  ) INTO update_policy_exists;

  IF NOT update_policy_exists THEN
    -- Créer une policy UPDATE simple si elle n'existe pas
    CREATE POLICY "profiles_update_own_only"
    ON public.profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
    
    RAISE NOTICE '✅ Policy UPDATE créée: profiles_update_own_only';
  ELSE
    RAISE NOTICE '✅ Policy UPDATE existe déjà';
  END IF;
END $$;

-- 5. Vérification : Lister toutes les policies sur profiles
SELECT 
  policyname,
  cmd,
  qual as "USING condition",
  with_check as "WITH CHECK condition"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 6. Vérification : Vérifier que la colonne existe
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'theme_preference';

-- 7. Test : Vérifier qu'un utilisateur peut mettre à jour son propre theme_preference
-- (Cette requête ne fait rien, elle vérifie juste les permissions)
-- Remplacez 'VOTRE_USER_ID' par un UUID réel pour tester
-- SELECT auth.uid() as current_user_id;
