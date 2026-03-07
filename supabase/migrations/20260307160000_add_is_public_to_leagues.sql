-- Add is_public column to leagues table
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Add index for performance on public lookup
CREATE INDEX IF NOT EXISTS idx_leagues_is_public ON leagues(is_public);

-- Update RLS for public leagues: everyone can see them
DROP POLICY IF EXISTS "Anyone can view public leagues" ON leagues;
CREATE POLICY "Anyone can view public leagues"
    ON leagues FOR SELECT
    USING (is_public = true);

-- Update RLS for club leagues: club members can see public leagues of their club
DROP POLICY IF EXISTS "Club members can view public club leagues" ON leagues;
CREATE POLICY "Club members can view public club leagues"
    ON leagues FOR SELECT
    USING (
        club_id IS NOT NULL 
        AND is_public = true
        AND club_id IN (
            SELECT club_id::uuid FROM profiles WHERE id = auth.uid()
        )
    );
