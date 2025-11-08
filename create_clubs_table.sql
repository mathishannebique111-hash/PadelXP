-- ============================================
-- CREATE CLUBS TABLE
-- ============================================
-- Ce script crée la table clubs avec toutes les colonnes nécessaires
-- Exécutez ce script dans Supabase SQL Editor AVANT fix_clubs_rls.sql

-- 1. Créer la table clubs si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  code_invitation TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'grace', 'suspended', 'archived')),
  city TEXT,
  postal_code TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  number_of_courts INTEGER,
  court_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_clubs_slug ON public.clubs(slug);
CREATE INDEX IF NOT EXISTS idx_clubs_code_invitation ON public.clubs(code_invitation);
CREATE INDEX IF NOT EXISTS idx_clubs_status ON public.clubs(status);

-- 3. Activer RLS
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- 4. Créer une policy pour permettre la lecture publique (SELECT)
DROP POLICY IF EXISTS clubs_select_public ON public.clubs;
CREATE POLICY clubs_select_public
ON public.clubs
FOR SELECT
USING (true); -- Permet à tout le monde de lire les clubs

-- 5. Créer une policy pour permettre l'insertion aux utilisateurs authentifiés
-- (pour que les clubs puissent s'inscrire via le dashboard)
DROP POLICY IF EXISTS clubs_insert_authenticated ON public.clubs;
CREATE POLICY clubs_insert_authenticated
ON public.clubs
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 6. Insérer les clubs existants si nécessaire
-- TCAM
INSERT INTO public.clubs (name, slug, code_invitation, status, city, postal_code)
VALUES ('TCAM', 'tcam80300', 'TCAM80300', 'active', 'Amiens', '80300')
ON CONFLICT (slug) DO NOTHING;

-- Amiens Padel (si les données existent déjà, elles seront mises à jour)
INSERT INTO public.clubs (name, slug, code_invitation, status, city, postal_code)
VALUES ('Amiens Padel', 'amienspadel76210', 'AMIENSPADEL76210', 'active', 'Amiens', '76210')
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name,
    code_invitation = EXCLUDED.code_invitation,
    status = EXCLUDED.status;

-- 7. Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Table clubs created successfully with RLS policies.';
END $$;



