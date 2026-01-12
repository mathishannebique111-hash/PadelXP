-- =============================================
-- MISE À JOUR DE get_partner_phone POUR SUPPORTER LES INVITATIONS
-- =============================================

-- Créer ou remplacer la fonction get_partner_phone
-- Elle autorise l'accès au numéro si :
-- 1. Un partenariat accepté existe
-- 2. OU une invitation de match acceptée existe
CREATE OR REPLACE FUNCTION get_partner_phone(partner_uuid UUID)
RETURNS TABLE(phone TEXT, whatsapp_enabled BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_relationship BOOLEAN;
  current_user_id UUID;
BEGIN
  -- Récupérer l'ID de l'utilisateur actuel
  current_user_id := auth.uid();
  
  -- Vérifier si un partenariat existe OU une invitation acceptée
  SELECT EXISTS (
    -- Partenariats réguliers
    SELECT 1 FROM player_partnerships 
    WHERE status = 'accepted'
      AND (
        (player_id = current_user_id AND partner_id = partner_uuid) OR
        (player_id = partner_uuid AND partner_id = current_user_id)
      )
    
    UNION ALL
    
    -- Invitations de match acceptées
    SELECT 1 FROM match_invitations
    WHERE status = 'accepted'
      AND (
        (sender_id = current_user_id AND receiver_id = partner_uuid) OR
        (sender_id = partner_uuid AND receiver_id = current_user_id)
      )
  ) INTO has_relationship;

  -- Si une relation existe, retourner le numéro
  IF has_relationship THEN
    RETURN QUERY 
    SELECT 
      p.phone_number::TEXT as phone, 
      COALESCE(p.whatsapp_enabled, false) as whatsapp_enabled
    FROM profiles p 
    WHERE p.id = partner_uuid 
      AND p.phone_number IS NOT NULL
      AND p.phone_number != '';
  ELSE
    RETURN;
  END IF;
END;
$$;

-- Commentaire
COMMENT ON FUNCTION get_partner_phone(UUID) IS 'Retourne le numéro de téléphone d''un partenaire si un partenariat accepté ou une invitation acceptée existe';
