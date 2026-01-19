-- Migration: Système Multi-Clubs - Phase 1.3
-- Créer la table unregistered_clubs (clubs déclarés par les joueurs mais sans abonnement)

-- Table unregistered_clubs : clubs non-clients de l'app
CREATE TABLE IF NOT EXISTS unregistered_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  created_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'converted')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour la recherche autocomplete par nom
CREATE INDEX IF NOT EXISTS idx_unregistered_clubs_name ON unregistered_clubs(name);

-- Index pour la recherche par ville
CREATE INDEX IF NOT EXISTS idx_unregistered_clubs_city ON unregistered_clubs(city);

-- Index composite pour recherche nom+ville (éviter les doublons)
CREATE INDEX IF NOT EXISTS idx_unregistered_clubs_name_city ON unregistered_clubs(LOWER(name), LOWER(city));

-- Index sur status pour le dashboard admin
CREATE INDEX IF NOT EXISTS idx_unregistered_clubs_status ON unregistered_clubs(status);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_unregistered_clubs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_unregistered_clubs_updated_at ON unregistered_clubs;
CREATE TRIGGER trigger_unregistered_clubs_updated_at
  BEFORE UPDATE ON unregistered_clubs
  FOR EACH ROW
  EXECUTE FUNCTION update_unregistered_clubs_updated_at();

-- RLS (Row Level Security)
ALTER TABLE unregistered_clubs ENABLE ROW LEVEL SECURITY;

-- Politique : tous les utilisateurs authentifiés peuvent lire les clubs
CREATE POLICY "Authenticated users can view unregistered clubs" ON unregistered_clubs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Politique : les utilisateurs authentifiés peuvent créer des clubs
CREATE POLICY "Authenticated users can create unregistered clubs" ON unregistered_clubs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Commentaires pour documentation
COMMENT ON TABLE unregistered_clubs IS 'Clubs déclarés par les joueurs mais sans abonnement à l''app';
COMMENT ON COLUMN unregistered_clubs.status IS 'pending = en attente, verified = vérifié, converted = converti en club inscrit';
COMMENT ON COLUMN unregistered_clubs.created_by_user_id IS 'Utilisateur qui a déclaré ce club en premier';
