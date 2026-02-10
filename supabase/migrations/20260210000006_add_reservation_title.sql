
-- Migration to add title column to reservations
-- This allows admins to add descriptive notes/titles to manual blocks

-- 1. Add title column if it doesn't exist
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS "title" TEXT;

-- 2. Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Colonne title ajoutée à la table reservations';
END $$;
