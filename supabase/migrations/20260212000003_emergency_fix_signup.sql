
-- EMERGENCY FIX: RESTORE SIGNUP FUNCTIONALITY
-- This script drops the existing trigger and function to ensure no bad logic remains,
-- then recreates them with strict safety defaults to prevent 500 errors.

-- 1. Drop existing trigger and function to clean the slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Recreate the function with SAFETY DEFAULTS for NOT NULL constraints
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
    email,
    postal_code,
    city,
    department_code,
    region_code,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    -- SAFETY: Force a display_name even if everything else is missing
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      NULLIF(split_part(new.email, '@', 1), ''), 
      'Nouveau Joueur'
    ),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    new.email, -- Ensures email is synced
    COALESCE(new.raw_user_meta_data->>'postal_code', ''),
    COALESCE(new.raw_user_meta_data->>'city', ''),
    COALESCE(new.raw_user_meta_data->>'department_code', ''),
    COALESCE(new.raw_user_meta_data->>'region_code', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email, -- Keep email synced on conflict
    updated_at = now();
  
  RETURN new;
END;
$$;

-- 3. Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
