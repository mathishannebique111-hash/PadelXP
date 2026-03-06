-- Add club_id to leagues table
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_leagues_club_id ON leagues(club_id);

-- Update RLS policies for leagues
-- Allow club admins to manage leagues for their club
CREATE POLICY "Club admins can manage their club's leagues"
    ON leagues FOR ALL
    USING (
        club_id IN (
            SELECT club_id FROM club_admins WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        club_id IN (
            SELECT club_id FROM club_admins WHERE user_id = auth.uid()
        )
    );

-- Allow players to view leagues for their club
CREATE POLICY "Players can view leagues from their current club"
    ON leagues FOR SELECT
    USING (
        club_id IS NOT NULL 
        AND club_id IN (
            SELECT club_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Ensure creators can still manage their private leagues (even if not in a club context)
-- (The existing "Creator can update their leagues" policy handles this but check if it's sufficient)
