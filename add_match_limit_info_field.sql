-- Script pour ajouter le champ match_limit_info_understood à la table profiles
-- Ce champ permet de sauvegarder si l'utilisateur a cliqué sur "Compris" pour le message d'information
-- sur la limite de 2 matchs par jour dans la page "enregistrer un match"
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Ajouter la colonne si elle n'existe pas déjà
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'match_limit_info_understood'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN match_limit_info_understood BOOLEAN DEFAULT FALSE;
    
    -- Ajouter un commentaire pour documenter le champ
    COMMENT ON COLUMN public.profiles.match_limit_info_understood IS 
    'Indique si l''utilisateur a cliqué sur "Compris" pour le message d''information sur la limite de 2 matchs par jour dans la page "enregistrer un match". Persiste même après déconnexion/reconnexion.';
  END IF;
END $$;

-- Vérifier que la colonne a été ajoutée
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'match_limit_info_understood';

