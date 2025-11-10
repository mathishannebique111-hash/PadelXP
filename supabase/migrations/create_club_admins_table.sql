-- Table pour gérer les administrateurs de clubs
CREATE TABLE IF NOT EXISTS club_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin', -- 'owner' ou 'admin'
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un utilisateur ne peut être admin qu'une seule fois par club
  UNIQUE(club_id, user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_club_admins_club_id ON club_admins(club_id);
CREATE INDEX IF NOT EXISTS idx_club_admins_user_id ON club_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_club_admins_email ON club_admins(email);

-- RLS (Row Level Security)
ALTER TABLE club_admins ENABLE ROW LEVEL SECURITY;

-- Policy: Les administrateurs peuvent voir les admins de leur club
CREATE POLICY "Admins can view their club admins"
  ON club_admins
  FOR SELECT
  USING (
    club_id IN (
      SELECT club_id FROM club_admins WHERE user_id = auth.uid()
    )
  );

-- Policy: Les administrateurs peuvent inviter d'autres admins
CREATE POLICY "Admins can invite other admins"
  ON club_admins
  FOR INSERT
  WITH CHECK (
    club_id IN (
      SELECT club_id FROM club_admins WHERE user_id = auth.uid()
    )
  );

-- Policy: Seul le propriétaire peut supprimer des admins
CREATE POLICY "Only owner can remove admins"
  ON club_admins
  FOR DELETE
  USING (
    club_id IN (
      SELECT club_id FROM club_admins 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Commentaires pour documentation
COMMENT ON TABLE club_admins IS 'Gestion des administrateurs de clubs';
COMMENT ON COLUMN club_admins.club_id IS 'ID du club';
COMMENT ON COLUMN club_admins.user_id IS 'ID de l''utilisateur administrateur';
COMMENT ON COLUMN club_admins.email IS 'Email de l''administrateur';
COMMENT ON COLUMN club_admins.role IS 'Rôle: owner (propriétaire) ou admin';
COMMENT ON COLUMN club_admins.invited_by IS 'ID de l''utilisateur qui a invité cet admin';
COMMENT ON COLUMN club_admins.invited_at IS 'Date et heure de l''invitation';

