-- Nettoyage : recalcul des compteurs de matchs sans dépendre de player1_id / player2_id
-- On remplace le trigger existant sur matches par un trigger sur match_participants
-- et on compte via match_participants + profiles (club_id).

-- 1) Supprimer l'ancien trigger basé sur matches
DROP TRIGGER IF EXISTS trigger_update_club_matches_count ON matches;

-- 2) Nouvelle fonction utilisant match_participants
CREATE OR REPLACE FUNCTION update_club_matches_count_from_participants()
RETURNS TRIGGER AS $$
DECLARE
  affected_club_ids UUID[];
BEGIN
  -- Récupère les clubs impactés via les participants du match (NEW ou OLD)
  SELECT ARRAY_AGG(DISTINCT p.club_id)
  INTO affected_club_ids
  FROM match_participants mp
  JOIN profiles p ON p.id = mp.user_id
  WHERE mp.match_id = COALESCE(NEW.match_id, OLD.match_id)
    AND p.club_id IS NOT NULL;

  -- Met à jour le compteur pour chaque club concerné
  IF affected_club_ids IS NOT NULL THEN
    UPDATE clubs
    SET total_matches_count = (
      SELECT COUNT(DISTINCT m.id)
      FROM matches m
      JOIN match_participants mp2 ON mp2.match_id = m.id
      JOIN profiles p2 ON p2.id = mp2.user_id
      WHERE p2.club_id = clubs.id
    )
    WHERE id = ANY(affected_club_ids);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 3) Créer le trigger sur match_participants (insert/update/delete)
DROP TRIGGER IF EXISTS trigger_update_club_matches_count_participants ON match_participants;
CREATE TRIGGER trigger_update_club_matches_count_participants
AFTER INSERT OR UPDATE OR DELETE ON match_participants
FOR EACH ROW
EXECUTE FUNCTION update_club_matches_count_from_participants();

