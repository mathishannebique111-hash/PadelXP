-- ============================================
-- CRÉER LES PROFILS ADMIN MANQUANTS
-- ============================================
-- Ce script crée les profils dans la table profiles pour les utilisateurs admin
-- qui existent déjà dans auth.users mais n'ont pas de profil

-- Étape 1: Récupérer les IDs des utilisateurs admin depuis auth.users
-- (Vous devrez remplacer les UUIDs par les vrais IDs de vos utilisateurs)

-- Pour contactpadelxp@gmail.com
DO $$
DECLARE
  admin1_id UUID;
  admin1_email TEXT := 'contactpadelxp@gmail.com';
  admin1_display_name TEXT := 'Admin PadelXP';
BEGIN
  -- Récupérer l'ID de l'utilisateur
  SELECT id INTO admin1_id
  FROM auth.users
  WHERE email = admin1_email
  LIMIT 1;

  -- Si l'utilisateur existe et n'a pas de profil, créer le profil
  IF admin1_id IS NOT NULL THEN
    INSERT INTO public.profiles (
      id,
      email,
      display_name,
      first_name,
      last_name,
      created_at,
      updated_at
    )
    SELECT 
      admin1_id,
      admin1_email,
      admin1_display_name,
      'Admin',
      'PadelXP',
      NOW(),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = admin1_id
    );
    
    RAISE NOTICE 'Profil créé pour % (ID: %)', admin1_email, admin1_id;
  ELSE
    RAISE NOTICE 'Utilisateur % non trouvé dans auth.users', admin1_email;
  END IF;
END $$;

-- Pour mathis.hannebique111@gmail.com
DO $$
DECLARE
  admin2_id UUID;
  admin2_email TEXT := 'mathis.hannebique111@gmail.com';
  admin2_display_name TEXT := 'Mathis Hannebique';
BEGIN
  -- Récupérer l'ID de l'utilisateur
  SELECT id INTO admin2_id
  FROM auth.users
  WHERE email = admin2_email
  LIMIT 1;

  -- Si l'utilisateur existe et n'a pas de profil, créer le profil
  IF admin2_id IS NOT NULL THEN
    INSERT INTO public.profiles (
      id,
      email,
      display_name,
      first_name,
      last_name,
      created_at,
      updated_at
    )
    SELECT 
      admin2_id,
      admin2_email,
      admin2_display_name,
      'Mathis',
      'Hannebique',
      NOW(),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = admin2_id
    );
    
    RAISE NOTICE 'Profil créé pour % (ID: %)', admin2_email, admin2_id;
  ELSE
    RAISE NOTICE 'Utilisateur % non trouvé dans auth.users', admin2_email;
  END IF;
END $$;

-- Vérification : Afficher les profils créés
SELECT 
  p.id,
  p.email,
  p.display_name,
  p.first_name,
  p.last_name,
  p.created_at
FROM public.profiles p
WHERE p.email IN ('contactpadelxp@gmail.com', 'mathis.hannebique111@gmail.com')
ORDER BY p.email;

