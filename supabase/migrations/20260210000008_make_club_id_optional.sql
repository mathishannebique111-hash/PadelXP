-- Migration: Pivot "Player-Centric"
-- Objectif: Rendre le club optionnel pour permettre aux joueurs "freelance" d'exister.

-- 1. Rendre club_id et club_slug optionnels dans la table profiles
ALTER TABLE profiles ALTER COLUMN club_id DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN club_slug DROP NOT NULL;

-- 2. Mettre à jour la vue suggested_partners pour retirer la restriction club_id
-- (On copie la définition précédente mais en retirant AND p1.club_id = p2.club_id)
CREATE OR REPLACE VIEW suggested_partners AS
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
    p.niveau_padel as level,
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
partner_candidates AS (
  SELECT 
    p1.id as player_id,
    p1.first_name as player_first_name,
    p1.last_name as player_last_name,
    p1.avatar_url as player_avatar,
    p1.level as player_level,
    p1.winrate as player_winrate,
    p2.id as partner_id,
    p2.first_name as partner_first_name,
    p2.last_name as partner_last_name,
    p2.avatar_url as partner_avatar,
    p2.level as partner_level,
    p2.winrate as partner_winrate,
    ABS(p1.level - p2.level) as level_diff,
    (p1.level + p2.level) / 2 as pair_avg_level,
    (p1.winrate + p2.winrate) / 2 as pair_avg_winrate,
    
    (
      CASE 
        WHEN ABS(p1.level - p2.level) <= 0.3 THEN 50
        WHEN ABS(p1.level - p2.level) <= 0.5 THEN 40
        WHEN ABS(p1.level - p2.level) <= 0.7 THEN 25
        WHEN ABS(p1.level - p2.level) <= 1.0 THEN 10
        ELSE 0
      END
      +
      CASE 
        WHEN (p1.play_style = 'attacker' AND p2.play_style = 'defender') OR 
             (p1.play_style = 'defender' AND p2.play_style = 'attacker') THEN 30
        WHEN p1.play_style = 'balanced' OR p2.play_style = 'balanced' THEN 25
        ELSE 15
      END
      +
      CASE 
        WHEN ABS(p1.total_matches - p2.total_matches) <= 10 THEN 20
        WHEN ABS(p1.total_matches - p2.total_matches) <= 30 THEN 15
        ELSE 5
      END
    ) as compatibility_score
    
  FROM player_full_stats p1
  CROSS JOIN player_full_stats p2
  
  WHERE 
    p1.id != p2.id
    -- PIVOT: Suppression de la restriction club_id
    -- AND p1.club_id = p2.club_id 
    
    AND p1.level IS NOT NULL
    AND p2.level IS NOT NULL
    AND ABS(p1.level - p2.level) <= 1.0
    AND p1.total_matches >= 3
    AND p2.total_matches >= 3
)
SELECT 
  player_id,
  player_first_name,
  player_last_name,
  player_avatar,
  player_level,
  player_winrate,
  partner_id,
  partner_first_name,
  partner_last_name,
  partner_avatar,
  partner_level,
  partner_winrate,
  pair_avg_level,
  pair_avg_winrate,
  compatibility_score
FROM partner_candidates
ORDER BY player_id, compatibility_score DESC;

GRANT SELECT ON suggested_partners TO authenticated;


-- 3. Mettre à jour la vue suggested_pairs pour retirer la restriction club_id
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
    
    (
      CASE 
        WHEN ABS(p1.level - p2.level) <= 0.3 THEN 50
        WHEN ABS(p1.level - p2.level) <= 0.5 THEN 40
        WHEN ABS(p1.level - p2.level) <= 0.7 THEN 25
        WHEN ABS(p1.level - p2.level) <= 1.0 THEN 10
        ELSE 0
      END
      +
      CASE 
        WHEN (p1.play_style = 'attacker' AND p2.play_style = 'defender') OR 
             (p1.play_style = 'defender' AND p2.play_style = 'attacker') THEN 30
        WHEN p1.play_style = 'balanced' OR p2.play_style = 'balanced' THEN 25
        ELSE 15
      END
      +
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
    -- PIVOT: Suppression de la restriction club_id
    -- AND p1.club_id = p2.club_id
    
    AND NOT EXISTS (
      SELECT 1 FROM existing_partnerships ep 
      WHERE (ep.player_id = p1.id AND ep.partner_id = p2.id) OR
            (ep.player_id = p2.id AND ep.partner_id = p1.id)
    )
    
    AND ABS(p1.level - p2.level) <= 1.0
    
    AND (
      p1.looking_for_partner = true OR 
      p2.looking_for_partner = true OR
      (p1.looking_for_partner IS NULL AND p2.looking_for_partner IS NULL)
    )
    
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
