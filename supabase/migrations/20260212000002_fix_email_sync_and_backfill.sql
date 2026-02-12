
-- Fix: Force email update in handle_new_user and backfill missing emails
-- This ensures that even if a profile exists (e.g. from an incomplete previous trigger),
-- the email is correctly updated from auth.users.

CREATE OR REPLACE FUNCTION public.handle_new_user()
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
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    new.email, -- Always use the email from auth.users
    COALESCE(new.raw_user_meta_data->>'postal_code', ''),
    COALESCE(new.raw_user_meta_data->>'city', ''),
    COALESCE(new.raw_user_meta_data->>'department_code', ''),
    COALESCE(new.raw_user_meta_data->>'region_code', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email, -- Force update email
    updated_at = now();
  
  RETURN new;
END;
$$;

-- Backfill missing emails for existing profiles by joining with auth.users
-- Note: This requires appropriate permissions. If running via RLS/API it might fail,
-- but as a migration it typically runs with admin privileges.
-- We use a DO block to execute the update.

DO $$
BEGIN
  -- We cannot directly join auth.users in a simple update query due to schema isolation in some contexts,
  -- but commonly in Supabase migrations we can access auth schema.
  
  UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');
  
END $$;
