-- Fonction pour récupérer les infos d'authentification d'un utilisateur
-- Utilisée pour vérifier si un admin invité a défini son mot de passe

CREATE OR REPLACE FUNCTION get_user_auth_info(user_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  encrypted_password TEXT,
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::TEXT,
    u.encrypted_password::TEXT,
    u.last_sign_in_at,
    u.email_confirmed_at
  FROM auth.users u
  WHERE u.id = user_id_param;
END;
$$;

-- Donner les permissions à authenticated users
GRANT EXECUTE ON FUNCTION get_user_auth_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_auth_info(UUID) TO service_role;

COMMENT ON FUNCTION get_user_auth_info IS 'Récupère les informations d''authentification d''un utilisateur pour vérifier s''il a défini un mot de passe';

