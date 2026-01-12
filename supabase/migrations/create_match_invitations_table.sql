-- =============================================
-- TABLE : INVITATIONS PONCTUELLES DE MATCH
-- =============================================

CREATE TABLE IF NOT EXISTS match_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'refused', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  responded_at TIMESTAMPTZ,
  CHECK (sender_id != receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_match_invitations_sender ON match_invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_match_invitations_receiver ON match_invitations(receiver_id);
CREATE INDEX IF NOT EXISTS idx_match_invitations_status ON match_invitations(status);
CREATE INDEX IF NOT EXISTS idx_match_invitations_expires ON match_invitations(expires_at);

-- RLS
ALTER TABLE match_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see their sent invitations" ON match_invitations;
DROP POLICY IF EXISTS "Users see their received invitations" ON match_invitations;
DROP POLICY IF EXISTS "Users create invitations" ON match_invitations;
DROP POLICY IF EXISTS "Users update received invitations" ON match_invitations;
DROP POLICY IF EXISTS "Users delete their sent invitations" ON match_invitations;

CREATE POLICY "Users see their sent invitations"
ON match_invitations FOR SELECT TO authenticated
USING (sender_id = auth.uid());

CREATE POLICY "Users see their received invitations"
ON match_invitations FOR SELECT TO authenticated
USING (receiver_id = auth.uid());

CREATE POLICY "Users create invitations"
ON match_invitations FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users update received invitations"
ON match_invitations FOR UPDATE TO authenticated
USING (receiver_id = auth.uid());

CREATE POLICY "Users delete their sent invitations"
ON match_invitations FOR DELETE TO authenticated
USING (sender_id = auth.uid());

-- Fonction pour marquer automatiquement les invitations expirées
CREATE OR REPLACE FUNCTION mark_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE match_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Commentaire
COMMENT ON TABLE match_invitations IS 'Invitations ponctuelles à jouer une partie (différentes des partenariats habituels)';
