-- Table pour stocker les badges personnalisés gagnés via les challenges
CREATE TABLE IF NOT EXISTS challenge_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_emoji TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index pour améliorer les performances
  UNIQUE(user_id, challenge_id)
);

-- Index pour rechercher rapidement les badges d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_challenge_badges_user_id ON challenge_badges(user_id);

-- Index pour rechercher rapidement les badges d'un challenge
CREATE INDEX IF NOT EXISTS idx_challenge_badges_challenge_id ON challenge_badges(challenge_id);

-- RLS (Row Level Security) - Les utilisateurs peuvent voir leurs propres badges
ALTER TABLE challenge_badges ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent lire leurs propres badges
CREATE POLICY "Users can read their own challenge badges"
  ON challenge_badges
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Le service role peut tout faire (pour l'API)
CREATE POLICY "Service role can do everything"
  ON challenge_badges
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Commentaires pour documentation
COMMENT ON TABLE challenge_badges IS 'Badges personnalisés gagnés via les challenges créés par les clubs';
COMMENT ON COLUMN challenge_badges.user_id IS 'ID de l''utilisateur qui a gagné le badge';
COMMENT ON COLUMN challenge_badges.challenge_id IS 'ID du challenge qui a donné ce badge';
COMMENT ON COLUMN challenge_badges.badge_name IS 'Nom du badge défini par le club';
COMMENT ON COLUMN challenge_badges.badge_emoji IS 'Emoji associé au badge';
COMMENT ON COLUMN challenge_badges.earned_at IS 'Date et heure d''obtention du badge';

