
-- Migration to add a foreign key from reservations to profiles
-- This allows joining profile information when fetching reservations

-- 1. Check and add foreign key to profiles
-- Note: created_by already references auth.users(id), but defining it towards public.profiles
-- is necessary for PostgREST to understand the relationship for client-side joins.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'reservations_created_by_profiles_fkey'
    ) THEN
        ALTER TABLE public.reservations
        ADD CONSTRAINT reservations_created_by_profiles_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id);
    END IF;
END $$;

-- 2. Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Relation reservations -> profiles ajoutée pour le planning';
END $$;
