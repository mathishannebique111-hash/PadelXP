-- ============================================
-- FIX COMPLET POUR LES PROFILS ET L'INSCRIPTION
-- ============================================
-- Copie-colle ce script dans Supabase SQL Editor et exécute-le
-- Ce script corrige tous les problèmes de liaison entre joueurs inscrits et données affichées

-- 1. CRÉER LA TABLE PROFILES SI ELLE N'EXISTE PAS
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  club_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AJOUTER LES COLONNES MANQUANTES
-- ============================================
DO $$
BEGIN
  -- Ajouter club_id si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'club_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;
  END IF;

  -- Ajouter club_slug si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'club_slug'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN club_slug TEXT;
  END IF;

  -- Ajouter first_name si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
  END IF;

  -- Ajouter last_name si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_name TEXT;
  END IF;

  -- Ajouter email si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- 3. CRÉER LE TRIGGER POUR CRÉER AUTOMATIQUEMENT UN PROFIL
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1),
      'Joueur'
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer et recréer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. CRÉER LES PROFILS MANQUANTS POUR LES UTILISATEURS EXISTANTS
-- ============================================
INSERT INTO public.profiles (id, display_name, email, first_name, last_name)
SELECT 
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    SPLIT_PART(u.email, '@', 1),
    'Joueur'
  ) as display_name,
  u.email,
  u.raw_user_meta_data->>'first_name' as first_name,
  u.raw_user_meta_data->>'last_name' as last_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 5. CONFIGURER LES RLS POLICIES (PERMISSIVES POUR LE MÊME CLUB)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS profiles_select_same_club ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS "read_league_profiles" ON public.profiles;
DROP POLICY IF EXISTS "read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;

-- Policy SELECT: Permettre la lecture des profils du même club
-- Cette policy permet de lire son propre profil + tous les profils du même club
CREATE POLICY profiles_select_same_club
ON public.profiles
FOR SELECT
USING (
  -- L'utilisateur peut toujours lire son propre profil
  id = auth.uid()
  OR
  -- L'utilisateur peut lire les profils des membres de son club (par club_id)
  (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.club_id IS NOT NULL
    )
    AND club_id IS NOT NULL
    AND club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  )
  OR
  -- L'utilisateur peut lire les profils des membres de son club (par club_slug)
  (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.club_slug IS NOT NULL
    )
    AND club_slug IS NOT NULL
    AND club_slug = (SELECT club_slug FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  )
  OR
  -- Si l'utilisateur n'a pas de club, il peut lire tous les profils sans club
  (
    NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.club_id IS NOT NULL OR p.club_slug IS NOT NULL)
    )
    AND (club_id IS NULL AND club_slug IS NULL)
  )
);

-- Policy INSERT: Créer son propre profil
CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

-- Policy UPDATE: Modifier son propre profil
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 6. CRÉER LES INDEX POUR AMÉLIORER LES PERFORMANCES
-- ============================================
CREATE INDEX IF NOT EXISTS profiles_club_id_idx ON public.profiles(club_id) WHERE club_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_club_slug_idx ON public.profiles(club_slug) WHERE club_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_display_name_idx ON public.profiles(display_name);
CREATE INDEX IF NOT EXISTS profiles_first_name_idx ON public.profiles(first_name);
CREATE INDEX IF NOT EXISTS profiles_last_name_idx ON public.profiles(last_name);

-- 7. CRÉER UNE FONCTION POUR METTRE À JOUR LE DISPLAY_NAME
-- ============================================
CREATE OR REPLACE FUNCTION public.update_display_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Si display_name est vide mais first_name et last_name sont remplis
  IF (NEW.display_name IS NULL OR NEW.display_name = '') 
     AND NEW.first_name IS NOT NULL 
     AND NEW.last_name IS NOT NULL THEN
    NEW.display_name = TRIM(NEW.first_name || ' ' || NEW.last_name);
  END IF;
  
  -- Si first_name et last_name sont vides mais display_name est rempli
  IF (NEW.first_name IS NULL OR NEW.first_name = '') 
     AND (NEW.last_name IS NULL OR NEW.last_name = '')
     AND NEW.display_name IS NOT NULL THEN
    DECLARE
      name_parts TEXT[];
    BEGIN
      name_parts := STRING_TO_ARRAY(TRIM(NEW.display_name), ' ');
      NEW.first_name := name_parts[1];
      IF ARRAY_LENGTH(name_parts, 1) > 1 THEN
        NEW.last_name := ARRAY_TO_STRING(name_parts[2:], ' ');
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_display_name_trigger ON public.profiles;
CREATE TRIGGER update_display_name_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_display_name();

-- 8. MESSAGE DE CONFIRMATION
-- ============================================
DO $$
DECLARE
  profiles_count INTEGER;
  users_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profiles_count FROM public.profiles;
  SELECT COUNT(*) INTO users_count FROM auth.users;
  
  RAISE NOTICE '✅ Configuration complète terminée !';
  RAISE NOTICE '✅ Table profiles créée/mise à jour';
  RAISE NOTICE '✅ Trigger de création automatique configuré';
  RAISE NOTICE '✅ RLS policies configurées';
  RAISE NOTICE '✅ Index créés';
  RAISE NOTICE '✅ Profils créés: % / Utilisateurs: %', profiles_count, users_count;
END $$;



