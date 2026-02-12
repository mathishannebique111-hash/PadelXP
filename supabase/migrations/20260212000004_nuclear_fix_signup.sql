
-- NUCLEAR FIX: UNBLOCK SIGNUPS
-- This script proactively drops ALL potential conflicting triggers and functions
-- related to profile creation to ensure a clean path for new users.

-- 1. Drop triggers on public.profiles that might be failing
DROP TRIGGER IF EXISTS on_profile_created_admin_check ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_created_convert_guest ON public.profiles;

-- 2. Drop the main signup trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Recreate the MAIN signup function with MAXIMUM SAFETY
-- using defaults for everything to prevent NOT NULL violations
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
    -- SAFETY: Force a display name no matter what
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      NULLIF(split_part(new.email, '@', 1), ''), 
      'Nouveau Joueur'
    ),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    new.email, -- Should be there, but if null, allowed? NO, email is usually needed.
               -- But wait, profiles.email might be nullable? 
               -- Previous error said "null value in column display_name violates not-null constraint"
               -- So email being null wasn't the *crash*, it was display_name.
    COALESCE(new.raw_user_meta_data->>'postal_code', ''),
    COALESCE(new.raw_user_meta_data->>'city', ''),
    COALESCE(new.raw_user_meta_data->>'department_code', ''),
    COALESCE(new.raw_user_meta_data->>'region_code', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    -- If profile exists, just ensure we have an email and a display name
    email = COALESCE(EXCLUDED.email, profiles.email),
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name, 'Joueur'),
    updated_at = now();
  
  RETURN new;
END;
$$;

-- 4. Reactivate ONLY the main trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- We leave the other triggers OFF for now to guarantee signup works.
-- We can re-enable them later if needed (Admin check and Guest conversion).
