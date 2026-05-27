-- ============================================================
-- Seasons System: tables for seasonal leaderboard rankings
-- ============================================================

-- 1. Seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT seasons_dates_valid CHECK (end_date > start_date)
);

-- 2. Season rewards (top 3 physical rewards per season)
CREATE TABLE IF NOT EXISTS season_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 3),
  reward_label TEXT NOT NULL,
  reward_description TEXT,
  reward_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(season_id, rank)
);

-- 3. Season results (frozen leaderboard at end of season)
CREATE TABLE IF NOT EXISTS season_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  final_rank INTEGER NOT NULL,
  final_points INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  matches_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(season_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seasons_club_id ON seasons(club_id);
CREATE INDEX IF NOT EXISTS idx_seasons_status ON seasons(status);
CREATE INDEX IF NOT EXISTS idx_seasons_club_status ON seasons(club_id, status);
CREATE INDEX IF NOT EXISTS idx_season_rewards_season_id ON season_rewards(season_id);
CREATE INDEX IF NOT EXISTS idx_season_results_season_id ON season_results(season_id);
CREATE INDEX IF NOT EXISTS idx_season_results_user_id ON season_results(user_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_results ENABLE ROW LEVEL SECURITY;

-- All comparisons cast both sides to text to avoid uuid/text mismatch

-- Seasons: authenticated users can read seasons of their club
CREATE POLICY "Users can read seasons of their club"
  ON seasons FOR SELECT
  TO authenticated
  USING (
    club_id::text IN (
      SELECT p.club_id::text FROM profiles p WHERE p.id::text = auth.uid()::text AND p.club_id IS NOT NULL
    )
  );

-- Seasons: club admins can manage seasons
CREATE POLICY "Club admins can insert seasons"
  ON seasons FOR INSERT
  TO authenticated
  WITH CHECK (
    club_id::text IN (
      SELECT ca.club_id::text FROM club_admins ca WHERE ca.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Club admins can update seasons"
  ON seasons FOR UPDATE
  TO authenticated
  USING (
    club_id::text IN (
      SELECT ca.club_id::text FROM club_admins ca WHERE ca.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Club admins can delete seasons"
  ON seasons FOR DELETE
  TO authenticated
  USING (
    club_id::text IN (
      SELECT ca.club_id::text FROM club_admins ca WHERE ca.user_id::text = auth.uid()::text
    )
  );

-- Season rewards: readable by club members, manageable by admins
CREATE POLICY "Users can read season rewards"
  ON season_rewards FOR SELECT
  TO authenticated
  USING (
    season_id IN (
      SELECT s.id FROM seasons s
      WHERE s.club_id::text IN (
        SELECT p.club_id::text FROM profiles p WHERE p.id::text = auth.uid()::text AND p.club_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Club admins can manage season rewards"
  ON season_rewards FOR ALL
  TO authenticated
  USING (
    season_id IN (
      SELECT s.id FROM seasons s
      WHERE s.club_id::text IN (
        SELECT ca.club_id::text FROM club_admins ca WHERE ca.user_id::text = auth.uid()::text
      )
    )
  );

-- Season results: readable by club members
CREATE POLICY "Users can read season results"
  ON season_results FOR SELECT
  TO authenticated
  USING (
    season_id IN (
      SELECT s.id FROM seasons s
      WHERE s.club_id::text IN (
        SELECT p.club_id::text FROM profiles p WHERE p.id::text = auth.uid()::text AND p.club_id IS NOT NULL
      )
    )
  );

-- Season results: service role only for inserts (finalization done server-side)
CREATE POLICY "Service role can manage season results"
  ON season_results FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
