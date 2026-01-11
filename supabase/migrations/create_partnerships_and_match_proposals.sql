-- =============================================
-- SYSTÈME DE PARTENAIRES ET PROPOSITIONS DE MATCH
-- =============================================

-- =============================================
-- TABLE 1 : PARTENAIRES HABITUELS
-- =============================================
CREATE TABLE IF NOT EXISTS player_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, partner_id),
  CHECK (player_id != partner_id)
);

CREATE INDEX IF NOT EXISTS idx_partnerships_player ON player_partnerships(player_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_partner ON player_partnerships(partner_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON player_partnerships(status);

-- =============================================
-- TABLE 2 : PROPOSITIONS DE MATCH
-- =============================================
CREATE TABLE IF NOT EXISTS match_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_player1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposer_player2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenged_player1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenged_player2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted_by_p1', 'accepted_by_p2', 'accepted', 'declined', 'expired')),
  match_date TIMESTAMPTZ,
  club_id UUID REFERENCES clubs(id),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  CHECK (proposer_player1_id != proposer_player2_id),
  CHECK (challenged_player1_id != challenged_player2_id)
);

CREATE INDEX IF NOT EXISTS idx_match_proposals_proposer1 ON match_proposals(proposer_player1_id);
CREATE INDEX IF NOT EXISTS idx_match_proposals_proposer2 ON match_proposals(proposer_player2_id);
CREATE INDEX IF NOT EXISTS idx_match_proposals_challenged1 ON match_proposals(challenged_player1_id);
CREATE INDEX IF NOT EXISTS idx_match_proposals_challenged2 ON match_proposals(challenged_player2_id);
CREATE INDEX IF NOT EXISTS idx_match_proposals_status ON match_proposals(status);

-- =============================================
-- TABLE 3 : NOTIFICATIONS (table déjà existante)
-- =============================================
-- La table notifications existe déjà avec les types: 'badge_unlocked', 'level_up', 'top3', 'referral', 'challenge', 'badge'
-- On ajoute les nouveaux types: 'partnership_request', 'partnership_accepted', 'match_proposal', 'match_accepted', 'match_declined'
-- Note: Il faut d'abord supprimer les notifications avec des types invalides, puis modifier la contrainte CHECK

-- Étape 1: Supprimer les notifications avec des types invalides (si nécessaire)
-- Pour éviter l'erreur de contrainte CHECK
DELETE FROM public.notifications 
WHERE type NOT IN (
  -- Types existants
  'badge_unlocked', 'level_up', 'top3', 'top3_ranking', 'referral', 'challenge', 'badge',
  'chat', 'system',
  -- Nouveaux types à ajouter
  'partnership_request', 'partnership_accepted', 'match_proposal', 'match_accepted', 'match_declined'
);

-- Étape 2: Supprimer l'ancienne contrainte CHECK
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Étape 3: Recréer la contrainte CHECK avec tous les types (y compris ceux de improve_notifications_table.sql)
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    -- Types originaux
    'badge_unlocked', 'level_up', 'top3', 'referral', 'challenge', 'badge',
    -- Types de improve_notifications_table.sql
    'top3_ranking', 'chat', 'system',
    -- Nouveaux types de cette migration
    'partnership_request', 'partnership_accepted', 'match_proposal', 'match_accepted', 'match_declined'
  ));

-- =============================================
-- VUE : PAIRES SUGGÉRÉES (avec club du joueur)
-- =============================================
-- Note: Vue simplifiée utilisant directement niveau_padel de profiles
-- La vue complète avec calculs de statistiques est dans improve_partner_suggestions.sql
CREATE OR REPLACE VIEW suggested_pairs AS
SELECT
  p1.id as player1_id,
  p1.first_name as player1_first_name,
  p1.last_name as player1_last_name,
  p1.avatar_url as player1_avatar,
  COALESCE(p1.niveau_padel, 5.0) as player1_level,
  50.0 as player1_winrate,
  p2.id as player2_id,
  p2.first_name as player2_first_name,
  p2.last_name as player2_last_name,
  p2.avatar_url as player2_avatar,
  COALESCE(p2.niveau_padel, 5.0) as player2_level,
  50.0 as player2_winrate,
  (COALESCE(p1.niveau_padel, 5.0) + COALESCE(p2.niveau_padel, 5.0)) / 2 as pair_avg_level,
  50.0 as pair_avg_winrate,
  p1.club_id,
  100 - ABS(COALESCE(p1.niveau_padel, 5.0) - COALESCE(p2.niveau_padel, 5.0)) * 10 as compatibility_score
FROM profiles p1
CROSS JOIN profiles p2
WHERE p1.id < p2.id
  AND p1.club_id = p2.club_id
  AND p1.club_id IS NOT NULL
  AND p1.niveau_padel IS NOT NULL
  AND p2.niveau_padel IS NOT NULL
  AND ABS(COALESCE(p1.niveau_padel, 5.0) - COALESCE(p2.niveau_padel, 5.0)) <= 2.0
ORDER BY compatibility_score DESC;

GRANT SELECT ON suggested_pairs TO authenticated;

-- =============================================
-- FONCTION : Créer notification
-- =============================================
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, COALESCE(p_data, '{}'::jsonb))
  RETURNING id INTO notification_id;
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS : Notifications automatiques
-- =============================================
CREATE OR REPLACE FUNCTION notify_partnership_request()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    NEW.partner_id,
    'partnership_request',
    'Demande de partenariat',
    (SELECT first_name || ' ' || last_name FROM profiles WHERE id = NEW.player_id) || ' souhaite être votre partenaire',
    jsonb_build_object('partnership_id', NEW.id, 'player_id', NEW.player_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_partnership_request ON player_partnerships;
CREATE TRIGGER trigger_notify_partnership_request
AFTER INSERT ON player_partnerships
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION notify_partnership_request();

CREATE OR REPLACE FUNCTION notify_partnership_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    PERFORM create_notification(
      NEW.player_id,
      'partnership_accepted',
      'Partenariat accepté',
      (SELECT first_name || ' ' || last_name FROM profiles WHERE id = NEW.partner_id) || ' a accepté votre demande',
      jsonb_build_object('partnership_id', NEW.id, 'partner_id', NEW.partner_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_partnership_accepted ON player_partnerships;
CREATE TRIGGER trigger_notify_partnership_accepted
AFTER UPDATE ON player_partnerships
FOR EACH ROW
EXECUTE FUNCTION notify_partnership_accepted();

CREATE OR REPLACE FUNCTION notify_match_proposal()
RETURNS TRIGGER AS $$
DECLARE
  proposer1_name TEXT;
  proposer2_name TEXT;
BEGIN
  SELECT first_name || ' ' || last_name INTO proposer1_name FROM profiles WHERE id = NEW.proposer_player1_id;
  SELECT first_name || ' ' || last_name INTO proposer2_name FROM profiles WHERE id = NEW.proposer_player2_id;
  
  PERFORM create_notification(
    NEW.challenged_player1_id,
    'match_proposal',
    'Proposition de match',
    proposer1_name || ' et ' || proposer2_name || ' vous proposent un match',
    jsonb_build_object('proposal_id', NEW.id)
  );
  
  PERFORM create_notification(
    NEW.challenged_player2_id,
    'match_proposal',
    'Proposition de match',
    proposer1_name || ' et ' || proposer2_name || ' vous proposent un match',
    jsonb_build_object('proposal_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_match_proposal ON match_proposals;
CREATE TRIGGER trigger_notify_match_proposal
AFTER INSERT ON match_proposals
FOR EACH ROW
EXECUTE FUNCTION notify_match_proposal();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE player_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_proposals ENABLE ROW LEVEL SECURITY;
-- Note: notifications a déjà RLS activé dans create_notifications_system.sql

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users see their partnerships" ON player_partnerships;
DROP POLICY IF EXISTS "Users create partnerships" ON player_partnerships;
DROP POLICY IF EXISTS "Users update their partnerships" ON player_partnerships;
DROP POLICY IF EXISTS "Users see their match proposals" ON match_proposals;
DROP POLICY IF EXISTS "Users create match proposals" ON match_proposals;
DROP POLICY IF EXISTS "Users update match proposals" ON match_proposals;
-- Note: Les policies pour notifications existent déjà dans create_notifications_system.sql

CREATE POLICY "Users see their partnerships"
ON player_partnerships FOR SELECT TO authenticated
USING (player_id = auth.uid() OR partner_id = auth.uid());

CREATE POLICY "Users create partnerships"
ON player_partnerships FOR INSERT TO authenticated
WITH CHECK (player_id = auth.uid());

CREATE POLICY "Users update their partnerships"
ON player_partnerships FOR UPDATE TO authenticated
USING (partner_id = auth.uid());

CREATE POLICY "Users see their match proposals"
ON match_proposals FOR SELECT TO authenticated
USING (
  proposer_player1_id = auth.uid() OR proposer_player2_id = auth.uid() OR 
  challenged_player1_id = auth.uid() OR challenged_player2_id = auth.uid()
);

CREATE POLICY "Users create match proposals"
ON match_proposals FOR INSERT TO authenticated
WITH CHECK (proposer_player1_id = auth.uid() OR proposer_player2_id = auth.uid());

CREATE POLICY "Users update match proposals"
ON match_proposals FOR UPDATE TO authenticated
USING (challenged_player1_id = auth.uid() OR challenged_player2_id = auth.uid());

-- Note: Les policies RLS pour notifications existent déjà dans create_notifications_system.sql

-- =============================================
-- ACTIVER REALTIME (À FAIRE MANUELLEMENT)
-- =============================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE player_partnerships;
-- ALTER PUBLICATION supabase_realtime ADD TABLE match_proposals;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Commentaires
COMMENT ON TABLE player_partnerships IS 'Partenariats entre joueurs';
COMMENT ON TABLE match_proposals IS 'Propositions de match entre équipes';
COMMENT ON TABLE notifications IS 'Notifications pour les joueurs';
COMMENT ON VIEW suggested_pairs IS 'Paires de joueurs suggérées basées sur niveau et winrate';
