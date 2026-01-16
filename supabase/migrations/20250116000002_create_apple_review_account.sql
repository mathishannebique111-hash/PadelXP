-- =====================================================
-- CRÉATION DU COMPTE DE TEST POUR APPLE REVIEW
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- IMPORTANT: Après avoir exécuté ce script, vous devez également
-- créer l'utilisateur dans Authentication > Users avec :
--   Email: apple-review@padelxp.eu
--   Password: ReviewXP2026!
-- =====================================================

DO $$
DECLARE
  v_club_id UUID;
  v_user_id UUID;
BEGIN
  -- 1. Récupérer l'ID du club "Padel Club"
  SELECT id INTO v_club_id
  FROM clubs
  WHERE code_invitation = 'PADELCLUB80000'
  LIMIT 1;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'Club avec code PADELCLUB80000 non trouvé. Exécutez d''abord la migration update_padel_club_invite_code.sql';
  END IF;

  RAISE NOTICE 'Club trouvé: %', v_club_id;

  -- 2. Vérifier si l'email existe déjà dans auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'apple-review@padelxp.eu'
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'Utilisateur déjà existant avec ID: %', v_user_id;
    
    -- Mettre à jour le profil existant
    UPDATE profiles
    SET 
      first_name = 'Apple',
      last_name = 'Review',
      club_id = v_club_id,
      updated_at = NOW()
    WHERE id = v_user_id;
    
    RAISE NOTICE 'Profil mis à jour avec succès';
  ELSE
    RAISE NOTICE 'Aucun utilisateur trouvé avec cet email.';
    RAISE NOTICE 'Veuillez créer l''utilisateur dans Authentication > Users avec:';
    RAISE NOTICE '  Email: apple-review@padelxp.eu';
    RAISE NOTICE '  Password: ReviewXP2026!';
    RAISE NOTICE 'Puis ré-exécutez ce script pour associer le profil au club.';
  END IF;

END $$;

-- Vérification finale
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.club_id,
  c.name as club_name,
  u.email
FROM profiles p
LEFT JOIN clubs c ON p.club_id = c.id
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.email = 'apple-review@padelxp.eu';
