-- Migration: Add suspension fields to clubs table
-- This enables club access suspension after 48h grace period

ALTER TABLE clubs
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of suspended clubs
CREATE INDEX IF NOT EXISTS idx_clubs_is_suspended ON clubs(is_suspended) WHERE is_suspended = true;
CREATE INDEX IF NOT EXISTS idx_clubs_scheduled_deletion ON clubs(scheduled_deletion_at) WHERE scheduled_deletion_at IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN clubs.is_suspended IS 'True if club access is suspended due to expired trial without subscription';
COMMENT ON COLUMN clubs.suspended_at IS 'Timestamp when the club was suspended';
COMMENT ON COLUMN clubs.scheduled_deletion_at IS 'Timestamp when club data will be deleted (suspended_at + 45 days)';
