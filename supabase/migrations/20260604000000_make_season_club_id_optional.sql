-- Make club_id optional on seasons table
-- Seasons without a club_id are global (visible to all players)
ALTER TABLE seasons ALTER COLUMN club_id DROP NOT NULL;

-- Update RLS: users can also see seasons with no club (global seasons)
DROP POLICY IF EXISTS "Users can read seasons of their club" ON seasons;
CREATE POLICY "Users can read seasons of their club or global"
  ON seasons FOR SELECT
  TO authenticated
  USING (
    club_id IS NULL
    OR club_id::text IN (
      SELECT p.club_id::text FROM profiles p WHERE p.id::text = auth.uid()::text AND p.club_id IS NOT NULL
    )
  );

-- Update RLS for season_rewards: include global seasons
DROP POLICY IF EXISTS "Users can read season rewards" ON season_rewards;
CREATE POLICY "Users can read season rewards"
  ON season_rewards FOR SELECT
  TO authenticated
  USING (
    season_id IN (
      SELECT s.id FROM seasons s
      WHERE s.club_id IS NULL
        OR s.club_id::text IN (
          SELECT p.club_id::text FROM profiles p WHERE p.id::text = auth.uid()::text AND p.club_id IS NOT NULL
        )
    )
  );

-- Update RLS for season_results: include global seasons
DROP POLICY IF EXISTS "Users can read season results" ON season_results;
CREATE POLICY "Users can read season results"
  ON season_results FOR SELECT
  TO authenticated
  USING (
    season_id IN (
      SELECT s.id FROM seasons s
      WHERE s.club_id IS NULL
        OR s.club_id::text IN (
          SELECT p.club_id::text FROM profiles p WHERE p.id::text = auth.uid()::text AND p.club_id IS NOT NULL
        )
    )
  );
