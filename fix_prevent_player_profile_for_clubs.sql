-- ============================================
-- FIX: Empêcher la création de profil joueur pour les comptes club
-- ============================================
-- Copie-colle ce script dans Supabase SQL Editor et exécute-le
-- Ce script modifie le trigger pour ne pas créer de profil si l'utilisateur est un compte club

-- 1. MODIFIER LA FONCTION handle_new_user() POUR IGNORER LES COMPTES CLUB
-- ============================================
-- Les comptes club ont user_metadata.role = 'owner'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Ne pas créer de profil joueur si c'est un compte club (role = 'owner')
  IF NEW.raw_user_meta_data->>'role' = 'owner' THEN
    -- C'est un compte club, on ne crée pas de profil joueur
    RETURN NEW;
  END IF;
  
  -- Sinon, créer le profil joueur comme d'habitude
  INSERT INTO public.profiles (id, display_name, email, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1),
      'Joueur'
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. SUPPRIMER LES PROFILS JOUEUR EXISTANTS POUR LES COMPTES CLUB
-- ============================================
-- Supprimer les profils de la table profiles pour les utilisateurs qui sont des comptes club
DELETE FROM public.profiles
WHERE id IN (
  SELECT u.id
  FROM auth.users u
  WHERE u.raw_user_meta_data->>'role' = 'owner'
);

-- Note: Après cette modification, les nouveaux comptes club ne créeront plus automatiquement
-- de profil joueur, et les profils existants pour les comptes club seront supprimés.
-- Les comptes club n'ont pas besoin de profil dans la table profiles, ils utilisent club_admins.

