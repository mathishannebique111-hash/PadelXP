
-- REVERT FIX: RESTORE SIGNUP (DISABLE EMAIL SYNC)
-- The user correctly pointed out that adding email sync logic caused the regression.
-- This script reverts 'handle_new_user' to a state where it DOES NOT touch the 'email' column.
-- We keep the 'display_name' safety ('Nouveau Joueur') because we know that prevents the other error.

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    full_name,
    avatar_url,
    -- email,  <-- REMOVED: potentially causing the conflict/crash
    postal_code,
    city,
    department_code,
    region_code,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    -- SAFE DISPLAY NAME (Keep this, it's vital)
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      NULLIF(split_part(new.email, '@', 1), ''), 
      'Nouveau Joueur'
    ),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    -- new.email, <-- REMOVED
    COALESCE(new.raw_user_meta_data->>'postal_code', ''),
    COALESCE(new.raw_user_meta_data->>'city', ''),
    COALESCE(new.raw_user_meta_data->>'department_code', ''),
    COALESCE(new.raw_user_meta_data->>'region_code', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    -- email = EXCLUDED.email, <-- REMOVED
    updated_at = now();
  
  RETURN new;
END;
$$;

-- Ensure trigger is active
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
