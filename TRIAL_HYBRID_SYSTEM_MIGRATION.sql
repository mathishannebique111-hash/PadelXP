-- =====================================================
-- SCRIPT SQL POUR LE SYSTÈME D'ESSAI HYBRIDE
-- =====================================================
-- 
-- Ce script ajoute tous les champs nécessaires à la table 'clubs'
-- pour gérer le système d'essai gratuit hybride avec extensions automatiques,
-- proposées et manuelles.
--
-- À exécuter dans Supabase SQL Editor ou via psql
-- =====================================================

-- 1. Ajouter les colonnes pour le système d'essai hybride
ALTER TABLE clubs
-- Essai de base (modification des champs existants si nécessaire)
ADD COLUMN IF NOT EXISTS trial_base_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_current_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_status TEXT DEFAULT 'active' CHECK (trial_status IN ('active', 'extended_auto', 'extended_proposed', 'extended_manual', 'expired', 'converted')),

-- Extension automatique
ADD COLUMN IF NOT EXISTS auto_extension_unlocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_extension_reason TEXT CHECK (auto_extension_reason IN ('10_players', '20_matches', '5_logins')),

-- Extension proposée
ADD COLUMN IF NOT EXISTS proposed_extension_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS proposed_extension_sent_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS proposed_extension_accepted BOOLEAN,

-- Extension manuelle
ADD COLUMN IF NOT EXISTS manual_extension_granted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS manual_extension_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS manual_extension_days INTEGER,
ADD COLUMN IF NOT EXISTS manual_extension_notes TEXT,
ADD COLUMN IF NOT EXISTS manual_extension_by_user_id UUID REFERENCES auth.users(id),

-- Métriques d'engagement (pour calculs)
ADD COLUMN IF NOT EXISTS total_players_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_matches_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_challenges_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dashboard_login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS invitations_sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_engagement_check_date TIMESTAMP WITH TIME ZONE;

-- 2. Mettre à jour les clubs existants pour initialiser les nouvelles colonnes
UPDATE clubs
SET 
  trial_base_end_date = COALESCE(trial_base_end_date, trial_start_date + INTERVAL '14 days'),
  trial_current_end_date = COALESCE(trial_current_end_date, trial_end_date, trial_start_date + INTERVAL '14 days'),
  trial_status = COALESCE(
    CASE 
      WHEN subscription_status = 'active' THEN 'converted'
      WHEN trial_end_date IS NOT NULL AND trial_end_date < NOW() THEN 'expired'
      ELSE 'active'
    END,
    'active'
  )
WHERE trial_base_end_date IS NULL OR trial_current_end_date IS NULL;

-- 3. Créer les index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_clubs_trial_status ON clubs(trial_status);
CREATE INDEX IF NOT EXISTS idx_clubs_trial_current_end_date ON clubs(trial_current_end_date) WHERE trial_current_end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clubs_auto_extension_unlocked ON clubs(auto_extension_unlocked) WHERE auto_extension_unlocked = TRUE;
CREATE INDEX IF NOT EXISTS idx_clubs_proposed_extension_sent ON clubs(proposed_extension_sent) WHERE proposed_extension_sent = TRUE;

-- 4. Fonction pour calculer automatiquement le nombre de joueurs d'un club
CREATE OR REPLACE FUNCTION update_club_players_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clubs
  SET total_players_count = (
    SELECT COUNT(DISTINCT id)
    FROM profiles
    WHERE club_id = COALESCE(NEW.club_id, OLD.club_id)
  )
  WHERE id = COALESCE(NEW.club_id, OLD.club_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le compteur de joueurs
DROP TRIGGER IF EXISTS trigger_update_club_players_count ON profiles;
CREATE TRIGGER trigger_update_club_players_count
AFTER INSERT OR UPDATE OR DELETE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_club_players_count();

-- 5. Fonction pour calculer automatiquement le nombre de matchs d'un club
CREATE OR REPLACE FUNCTION update_club_matches_count()
RETURNS TRIGGER AS $$
DECLARE
  affected_club_ids UUID[];
BEGIN
  -- Récupérer tous les club_ids des joueurs affectés
  SELECT ARRAY_AGG(DISTINCT club_id)
  INTO affected_club_ids
  FROM profiles
  WHERE id IN (
    COALESCE(NEW.player1_id, OLD.player1_id),
    COALESCE(NEW.player2_id, OLD.player2_id),
    COALESCE(NEW.player3_id, OLD.player3_id),
    COALESCE(NEW.player4_id, OLD.player4_id)
  )
  AND club_id IS NOT NULL;

  -- Mettre à jour le compteur pour chaque club affecté
  IF affected_club_ids IS NOT NULL THEN
    UPDATE clubs
    SET total_matches_count = (
      SELECT COUNT(DISTINCT m.id)
      FROM matches m
      JOIN profiles p1 ON p1.id = m.player1_id
      LEFT JOIN profiles p2 ON p2.id = m.player2_id
      LEFT JOIN profiles p3 ON p3.id = m.player3_id
      LEFT JOIN profiles p4 ON p4.id = m.player4_id
      WHERE (p1.club_id = clubs.id OR p2.club_id = clubs.id OR p3.club_id = clubs.id OR p4.club_id = clubs.id)
    )
    WHERE id = ANY(affected_club_ids);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le compteur de matchs
DROP TRIGGER IF EXISTS trigger_update_club_matches_count ON matches;
CREATE TRIGGER trigger_update_club_matches_count
AFTER INSERT OR UPDATE OR DELETE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_club_matches_count();

-- 6. Note : Les challenges sont stockés dans Supabase Storage (bucket "club-challenges")
-- et non dans une table SQL. Le comptage des challenges sera fait dans le code TypeScript
-- via la fonction updateEngagementMetrics() qui lit depuis le storage.

-- 8. Fonction pour incrémenter le compteur de connexions au dashboard
CREATE OR REPLACE FUNCTION increment_club_dashboard_login_count(p_club_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE clubs
  SET dashboard_login_count = COALESCE(dashboard_login_count, 0) + 1
  WHERE id = p_club_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Fonction pour incrémenter le compteur d'invitations envoyées
CREATE OR REPLACE FUNCTION increment_club_invitations_sent_count(p_club_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE clubs
  SET invitations_sent_count = COALESCE(invitations_sent_count, 0) + 1
  WHERE id = p_club_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Ajouter des commentaires pour la documentation
COMMENT ON COLUMN clubs.trial_base_end_date IS 'Date de fin de l''essai de base (J+14)';
COMMENT ON COLUMN clubs.trial_current_end_date IS 'Date de fin actuelle de l''essai (peut être prolongée)';
COMMENT ON COLUMN clubs.trial_status IS 'Statut de l''essai : active, extended_auto, extended_proposed, extended_manual, expired, converted';
COMMENT ON COLUMN clubs.auto_extension_unlocked IS 'Indique si l''extension automatique a été débloquée';
COMMENT ON COLUMN clubs.auto_extension_reason IS 'Raison du déblocage automatique : 10_players, 20_matches, 5_logins';
COMMENT ON COLUMN clubs.proposed_extension_sent IS 'Indique si l''email d''extension proposée a été envoyé';
COMMENT ON COLUMN clubs.proposed_extension_accepted IS 'Indique si le club a accepté l''extension proposée';
COMMENT ON COLUMN clubs.manual_extension_granted IS 'Indique si une extension manuelle a été accordée';
COMMENT ON COLUMN clubs.manual_extension_days IS 'Nombre de jours ajoutés lors de l''extension manuelle';
COMMENT ON COLUMN clubs.total_players_count IS 'Nombre total de joueurs inscrits au club (mis à jour automatiquement)';
COMMENT ON COLUMN clubs.total_matches_count IS 'Nombre total de matchs enregistrés par les joueurs du club (mis à jour automatiquement)';
COMMENT ON COLUMN clubs.total_challenges_count IS 'Nombre total de challenges créés par le club (mis à jour automatiquement)';
COMMENT ON COLUMN clubs.dashboard_login_count IS 'Nombre de connexions au dashboard';
COMMENT ON COLUMN clubs.invitations_sent_count IS 'Nombre d''invitations de joueurs envoyées';

-- =====================================================
-- VÉRIFICATION (optionnel - à exécuter après la migration)
-- =====================================================
-- 
-- Pour vérifier que la migration s'est bien passée, exécutez :
--
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'clubs'
--   AND column_name IN (
--     'trial_base_end_date',
--     'trial_current_end_date',
--     'trial_status',
--     'auto_extension_unlocked',
--     'auto_extension_reason',
--     'proposed_extension_sent',
--     'proposed_extension_accepted',
--     'manual_extension_granted',
--     'manual_extension_days',
--     'total_players_count',
--     'total_matches_count',
--     'total_challenges_count'
--   )
-- ORDER BY column_name;
--
-- =====================================================

