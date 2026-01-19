-- Fonction RPC pour incrémenter les points globaux de manière atomique
CREATE OR REPLACE FUNCTION increment_global_points(p_user_id UUID, p_points INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET global_points = COALESCE(global_points, 0) + p_points
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction RPC pour incrémenter les points club de manière atomique
CREATE OR REPLACE FUNCTION increment_club_points(p_user_id UUID, p_club_id UUID, p_points INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE user_clubs
  SET club_points = COALESCE(club_points, 0) + p_points
  WHERE user_id = p_user_id AND club_id = p_club_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION increment_global_points(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_global_points(UUID, INTEGER) TO service_role;

GRANT EXECUTE ON FUNCTION increment_club_points(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_club_points(UUID, UUID, INTEGER) TO service_role;
