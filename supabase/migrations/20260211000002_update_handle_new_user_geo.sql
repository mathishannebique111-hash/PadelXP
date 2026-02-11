-- Met à jour la fonction handle_new_user pour copier les champs géographiques
-- depuis les métadonnées de l'utilisateur vers la table profiles.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
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
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    new.raw_user_meta_data->>'postal_code',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'department_code',
    new.raw_user_meta_data->>'region_code',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    email = EXCLUDED.email,
    postal_code = COALESCE(EXCLUDED.postal_code, profiles.postal_code),
    city = COALESCE(EXCLUDED.city, profiles.city),
    department_code = COALESCE(EXCLUDED.department_code, profiles.department_code),
    region_code = COALESCE(EXCLUDED.region_code, profiles.region_code),
    updated_at = now();
  
  RETURN new;
END;
$$;
