-- Add confirmed_at to guest_players to track when the guest clicked the confirmation link
ALTER TABLE guest_players 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN guest_players.confirmed_at IS 'Timestamp when the guest confirmed their match participation via email link';
