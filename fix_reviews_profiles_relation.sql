-- Script pour établir la relation entre reviews et profiles
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Créer une fonction pour obtenir le display_name depuis profiles
CREATE OR REPLACE FUNCTION get_profile_display_name(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT display_name FROM public.profiles WHERE id = user_uuid LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Vérifier que la table profiles existe et a la bonne structure
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Vérifier que la table reviews existe et a la bonne structure
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'reviews'
ORDER BY ordinal_position;

