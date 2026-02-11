-- Fix: handle_new_user must populate ALL required columns including display_name
-- which was missing and causing "null value in column display_name violates not-null constraint"

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,    -- Added: Was missing and required (NOT NULL)
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
    -- Use full_name if available, otherwise email prefix as fallback display_name
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    COALESCE(new.raw_user_meta_data->>'postal_code', ''),
    COALESCE(new.raw_user_meta_data->>'city', ''),
    COALESCE(new.raw_user_meta_data->>'department_code', ''),
    COALESCE(new.raw_user_meta_data->>'region_code', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), profiles.display_name),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    email = EXCLUDED.email,
    postal_code = COALESCE(NULLIF(EXCLUDED.postal_code, ''), profiles.postal_code),
    city = COALESCE(NULLIF(EXCLUDED.city, ''), profiles.city),
    department_code = COALESCE(NULLIF(EXCLUDED.department_code, ''), profiles.department_code),
    region_code = COALESCE(NULLIF(EXCLUDED.region_code, ''), profiles.region_code),
    updated_at = now();
  
  RETURN new;
END;
$$;
