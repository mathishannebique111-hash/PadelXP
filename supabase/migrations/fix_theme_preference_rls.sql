-- Migration: Fix pour permettre la mise à jour de theme_preference
-- Ce script garantit que la colonne existe et que les policies RLS permettent sa mise à jour

-- 1. Ajouter la colonne theme_preference si elle n'existe pas
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light'));

-- 2. Commentaire
COMMENT ON COLUMN profiles.theme_preference IS 'Préférence de thème utilisateur: dark (par défaut) ou light';

-- 3. S'assurer que RLS est activé
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Vérifier qu'une policy UPDATE existe pour permettre la mise à jour de son propre profil
-- Si aucune policy UPDATE n'existe, en créer une
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND cmd = 'UPDATE'
  ) THEN
    -- Créer une policy UPDATE simple si elle n'existe pas
    CREATE POLICY "profiles_update_own_only"
    ON public.profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
    
    RAISE NOTICE 'Policy UPDATE créée: profiles_update_own_only';
  ELSE
    RAISE NOTICE 'Policy UPDATE existe déjà';
  END IF;
END $$;

-- 5. Vérification finale
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'theme_preference';
