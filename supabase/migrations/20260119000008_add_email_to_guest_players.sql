-- Add email and invite tracking to guest_players
ALTER TABLE guest_players 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS invited_by_user_id UUID REFERENCES auth.users(id);

-- Create index for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_guest_players_email ON guest_players(email);

-- Comment
COMMENT ON COLUMN guest_players.email IS 'Email optionnel pour inviter le joueur fantôme';
COMMENT ON COLUMN guest_players.invited_by_user_id IS 'Utilisateur ayant créé ce joueur fantôme (audit)';
