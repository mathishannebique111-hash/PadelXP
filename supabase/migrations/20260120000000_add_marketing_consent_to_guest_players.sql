-- Add marketing_consent to guest_players
ALTER TABLE guest_players 
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN guest_players.marketing_consent IS 'Indique si le joueur invité a consenti à recevoir des emails marketing du club';
