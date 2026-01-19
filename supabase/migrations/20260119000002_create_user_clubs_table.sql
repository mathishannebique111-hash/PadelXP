-- Migration: Système Multi-Clubs - Phase 1.2
-- Créer la table user_clubs (relation Many-to-Many entre joueurs et clubs)

-- Table user_clubs : permet aux joueurs d'appartenir à plusieurs clubs
CREATE TABLE IF NOT EXISTS user_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('principal', 'visiteur')) DEFAULT 'visiteur',
  club_points INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contrainte unique : un joueur ne peut appartenir qu'une fois à un club
  UNIQUE(user_id, club_id)
);

-- Index pour les requêtes de classement par club
CREATE INDEX IF NOT EXISTS idx_user_clubs_club_id ON user_clubs(club_id);

-- Index pour récupérer les clubs d'un joueur
CREATE INDEX IF NOT EXISTS idx_user_clubs_user_id ON user_clubs(user_id);

-- Index pour filtrer par rôle (principal vs visiteur)
CREATE INDEX IF NOT EXISTS idx_user_clubs_role ON user_clubs(role);

-- Index composite pour les classements (club_id + club_points)
CREATE INDEX IF NOT EXISTS idx_user_clubs_club_ranking ON user_clubs(club_id, club_points DESC);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_user_clubs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_clubs_updated_at ON user_clubs;
CREATE TRIGGER trigger_user_clubs_updated_at
  BEFORE UPDATE ON user_clubs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_clubs_updated_at();

-- RLS (Row Level Security)
ALTER TABLE user_clubs ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs peuvent voir leurs propres memberships
CREATE POLICY "Users can view own memberships" ON user_clubs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent voir les memberships de leur club
CREATE POLICY "Users can view club memberships" ON user_clubs
  FOR SELECT
  USING (
    club_id IN (
      SELECT club_id FROM user_clubs WHERE user_id = auth.uid()
    )
  );

-- Politique : les utilisateurs peuvent créer leur propre membership
CREATE POLICY "Users can create own membership" ON user_clubs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent modifier leur propre membership  
CREATE POLICY "Users can update own membership" ON user_clubs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Commentaires pour documentation
COMMENT ON TABLE user_clubs IS 'Relation Many-to-Many entre joueurs et clubs - permet le système multi-clubs';
COMMENT ON COLUMN user_clubs.role IS 'principal = club d''origine, visiteur = club secondaire';
COMMENT ON COLUMN user_clubs.club_points IS 'Points accumulés dans CE club uniquement';
