-- =============================================
-- AMÉLIORATION ALGORITHME DE SUGGESTION DE PARTENAIRES
-- =============================================

-- =============================================
-- SUPPRESSION ANCIENNE VUE
-- =============================================
DROP VIEW IF EXISTS suggested_pairs CASCADE;
DROP VIEW IF EXISTS suggested_partners CASCADE;

-- =============================================
-- NOUVELLE TABLE : PRÉFÉRENCES JOUEURS
-- =============================================
CREATE TABLE IF NOT EXISTS player_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  play_style TEXT CHECK (play_style IN ('attacker', 'defender', 'balanced')) DEFAULT 'balanced',
  preferred_frequency TEXT CHECK (preferred_frequency IN ('casual', 'regular', 'intensive')) DEFAULT 'regular',
  looking_for_partner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_preferences_player ON player_preferences(player_id);
CREATE INDEX IF NOT EXISTS idx_player_preferences_looking ON player_preferences(looking_for_partner) WHERE looking_for_partner = true;

-- =============================================
-- VUE : SUGGESTIONS DE PARTENAIRES (ULTRA QUALITATIVE)
-- Format compatible avec l'ancienne vue suggested_pairs pour le design existant
-- =============================================
CREATE OR REPLACE VIEW suggested_pairs AS
WITH match_stats AS (
  SELECT 
    mp.user_id,
    mp.match_id,
    mp.team,
    CASE 
      WHEN (m.winner_team_id = m.team1_id AND mp.team = 1) OR 
           (m.winner_team_id = m.team2_id AND mp.team = 2) 
      THEN 1 
      ELSE 0 
    END AS win
  FROM match_participants mp
  INNER JOIN matches m ON m.id = mp.match_id
  WHERE m.winner_team_id IS NOT NULL 
    AND m.team1_id IS NOT NULL 
    AND m.team2_id IS NOT NULL
    AND mp.player_type = 'user'
    AND mp.user_id IS NOT NULL
),
player_stats_aggregated AS (
  SELECT 
    user_id,
    COUNT(*)::integer as total_matches,
    SUM(win)::integer as wins,
    (COUNT(*)::integer - SUM(win)::integer) as losses,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (SUM(win)::float / COUNT(*) * 100)
      ELSE 50.0
    END as winrate
  FROM match_stats
  GROUP BY user_id
),
player_full_stats AS (
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.club_id,
    COALESCE(p.niveau_padel, 5.0) as level,
    COALESCE(psa.wins, 0) as wins,
    COALESCE(psa.losses, 0) as losses,
    COALESCE(psa.total_matches, 0) as total_matches,
    COALESCE(psa.winrate, 50.0) as winrate,
    COALESCE(pref.play_style, 'balanced') as play_style,
    COALESCE(pref.preferred_frequency, 'regular') as frequency,
    COALESCE(pref.looking_for_partner, false) as looking_for_partner
  FROM profiles p
  LEFT JOIN player_stats_aggregated psa ON p.id = psa.user_id
  LEFT JOIN player_preferences pref ON p.id = pref.player_id
  WHERE p.id IS NOT NULL
),
existing_partnerships AS (
  SELECT player_id, partner_id FROM player_partnerships WHERE status IN ('pending', 'accepted')
  UNION
  SELECT partner_id as player_id, player_id as partner_id FROM player_partnerships WHERE status IN ('pending', 'accepted')
),
pair_candidates AS (
  SELECT 
    p1.id as player1_id,
    p1.first_name as player1_first_name,
    p1.last_name as player1_last_name,
    p1.avatar_url as player1_avatar,
    p1.level as player1_level,
    p1.winrate as player1_winrate,
    p1.total_matches as player1_total_matches,
    p1.play_style as player1_play_style,
    p2.id as player2_id,
    p2.first_name as player2_first_name,
    p2.last_name as player2_last_name,
    p2.avatar_url as player2_avatar,
    p2.level as player2_level,
    p2.winrate as player2_winrate,
    p2.total_matches as player2_total_matches,
    p2.play_style as player2_play_style,
    ABS(p1.level - p2.level) as level_diff,
    (p1.level + p2.level) / 2 as pair_avg_level,
    (p1.winrate + p2.winrate) / 2 as pair_avg_winrate,
    p1.club_id,
    
    -- ===== SCORE DE COMPATIBILITÉ (100 points) =====
    (
      -- 1. Compatibilité de niveau (50 points)
      CASE 
        WHEN ABS(p1.level - p2.level) <= 0.3 THEN 50
        WHEN ABS(p1.level - p2.level) <= 0.5 THEN 40
        WHEN ABS(p1.level - p2.level) <= 0.7 THEN 25
        WHEN ABS(p1.level - p2.level) <= 1.0 THEN 10
        ELSE 0
      END
      +
      -- 2. Compatibilité de style (30 points)
      CASE 
        WHEN (p1.play_style = 'attacker' AND p2.play_style = 'defender') OR 
             (p1.play_style = 'defender' AND p2.play_style = 'attacker') THEN 30
        WHEN p1.play_style = 'balanced' OR p2.play_style = 'balanced' THEN 25
        ELSE 15
      END
      +
      -- 3. Compatibilité d'expérience (20 points)
      CASE 
        WHEN ABS(p1.total_matches - p2.total_matches) <= 10 THEN 20
        WHEN ABS(p1.total_matches - p2.total_matches) <= 30 THEN 15
        WHEN ABS(p1.total_matches - p2.total_matches) <= 50 THEN 8
        ELSE 3
      END
    ) as compatibility_score
    
  FROM player_full_stats p1
  CROSS JOIN player_full_stats p2
  
  WHERE 
    p1.id < p2.id
    AND p1.club_id = p2.club_id
    
    -- Exclusion partenariats existants
    AND NOT EXISTS (
      SELECT 1 FROM existing_partnerships ep 
      WHERE (ep.player_id = p1.id AND ep.partner_id = p2.id) OR
            (ep.player_id = p2.id AND ep.partner_id = p1.id)
    )
    
    -- CRITÈRE STRICT : Niveau max ±1.0 (au lieu de 2.0)
    AND ABS(p1.level - p2.level) <= 1.0
    
    -- Au moins un cherche un partenaire (si préférences définies)
    AND (
      p1.looking_for_partner = true OR 
      p2.looking_for_partner = true OR
      (p1.looking_for_partner IS NULL AND p2.looking_for_partner IS NULL)
    )
    
    -- Minimum d'expérience
    AND p1.total_matches >= 3
    AND p2.total_matches >= 3
)
SELECT 
  player1_id,
  player1_first_name,
  player1_last_name,
  player1_avatar,
  player1_level,
  player1_winrate,
  player2_id,
  player2_first_name,
  player2_last_name,
  player2_avatar,
  player2_level,
  player2_winrate,
  pair_avg_level,
  pair_avg_winrate,
  club_id,
  compatibility_score
FROM pair_candidates
ORDER BY compatibility_score DESC, level_diff ASC, pair_avg_winrate DESC;

GRANT SELECT ON suggested_pairs TO authenticated;

-- =============================================
-- RLS
-- =============================================
ALTER TABLE player_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see all preferences" ON player_preferences;
DROP POLICY IF EXISTS "Users manage their preferences" ON player_preferences;

CREATE POLICY "Users see all preferences"
ON player_preferences FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users manage their preferences"
ON player_preferences FOR ALL TO authenticated
USING (player_id = auth.uid())
WITH CHECK (player_id = auth.uid());

-- =============================================
-- FONCTION HELPER
-- =============================================
CREATE OR REPLACE FUNCTION set_looking_for_partner(looking BOOLEAN)
RETURNS VOID AS $$
BEGIN
  INSERT INTO player_preferences (player_id, looking_for_partner)
  VALUES (auth.uid(), looking)
  ON CONFLICT (player_id) 
  DO UPDATE SET 
    looking_for_partner = looking,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON VIEW suggested_pairs IS 'Suggestions de paires ultra-qualitatives : niveau max ±1.0, score multi-critères';
COMMENT ON TABLE player_preferences IS 'Préférences des joueurs pour améliorer les suggestions de partenaires';
