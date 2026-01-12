-- =============================================
-- TABLE : DÉFIS DE PAIRES (TEAM CHALLENGES)
-- =============================================

CREATE TABLE IF NOT EXISTS team_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_player_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenger_player_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  defender_player_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  defender_player_2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'refused')),
  defender_1_status TEXT DEFAULT 'pending' CHECK (defender_1_status IN ('pending', 'accepted', 'refused')),
  defender_2_status TEXT DEFAULT 'pending' CHECK (defender_2_status IN ('pending', 'accepted', 'refused')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',
  CHECK (challenger_player_1_id != challenger_player_2_id),
  CHECK (defender_player_1_id != defender_player_2_id),
  CHECK (challenger_player_1_id != defender_player_1_id),
  CHECK (challenger_player_1_id != defender_player_2_id),
  CHECK (challenger_player_2_id != defender_player_1_id),
  CHECK (challenger_player_2_id != defender_player_2_id)
);

CREATE INDEX IF NOT EXISTS idx_team_challenges_challenger_1 ON team_challenges(challenger_player_1_id);
CREATE INDEX IF NOT EXISTS idx_team_challenges_challenger_2 ON team_challenges(challenger_player_2_id);
CREATE INDEX IF NOT EXISTS idx_team_challenges_defender_1 ON team_challenges(defender_player_1_id);
CREATE INDEX IF NOT EXISTS idx_team_challenges_defender_2 ON team_challenges(defender_player_2_id);
CREATE INDEX IF NOT EXISTS idx_team_challenges_status ON team_challenges(status);
CREATE INDEX IF NOT EXISTS idx_team_challenges_expires ON team_challenges(expires_at);

-- RLS
ALTER TABLE team_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see challenges they sent" ON team_challenges;
DROP POLICY IF EXISTS "Users see challenges they received" ON team_challenges;
DROP POLICY IF EXISTS "Users create challenges" ON team_challenges;
DROP POLICY IF EXISTS "Users update challenges they received" ON team_challenges;
DROP POLICY IF EXISTS "Users delete challenges they sent" ON team_challenges;

-- Les challengers peuvent voir leurs défis envoyés
CREATE POLICY "Users see challenges they sent"
ON team_challenges FOR SELECT TO authenticated
USING (
  challenger_player_1_id = auth.uid() OR 
  challenger_player_2_id = auth.uid()
);

-- Les defenders peuvent voir leurs défis reçus
CREATE POLICY "Users see challenges they received"
ON team_challenges FOR SELECT TO authenticated
USING (
  defender_player_1_id = auth.uid() OR 
  defender_player_2_id = auth.uid()
);

-- Seul le challenger_player_1_id (capitaine) peut créer un défi
CREATE POLICY "Users create challenges"
ON team_challenges FOR INSERT TO authenticated
WITH CHECK (challenger_player_1_id = auth.uid());

-- Les defenders peuvent mettre à jour leur statut
CREATE POLICY "Users update challenges they received"
ON team_challenges FOR UPDATE TO authenticated
USING (
  defender_player_1_id = auth.uid() OR 
  defender_player_2_id = auth.uid()
);

-- Les challengers peuvent supprimer leurs défis envoyés
CREATE POLICY "Users delete challenges they sent"
ON team_challenges FOR DELETE TO authenticated
USING (
  challenger_player_1_id = auth.uid() OR 
  challenger_player_2_id = auth.uid()
);

-- Fonction pour marquer automatiquement les défis expirés
CREATE OR REPLACE FUNCTION mark_expired_team_challenges()
RETURNS void AS $$
BEGIN
  UPDATE team_challenges
  SET status = 'refused'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Commentaire
COMMENT ON TABLE team_challenges IS 'Défis de paires entre deux équipes de deux joueurs';
