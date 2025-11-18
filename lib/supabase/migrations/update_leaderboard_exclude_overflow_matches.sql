-- ============================================
-- MISE À JOUR DE LA VUE LEADERBOARD
-- ============================================
-- Cette migration met à jour la vue leaderboard pour exclure les matchs
-- où un joueur a déjà fait 2 matchs dans la journée (limite quotidienne)
-- Exécutez ce script dans Supabase SQL Editor

-- Drop existing view
DROP VIEW IF EXISTS public.leaderboard;

-- Create new leaderboard view that excludes matches beyond the daily limit
CREATE OR REPLACE VIEW public.leaderboard AS
WITH player_stats AS (
  -- Récupérer tous les matchs d'un joueur avec leur date de jeu
  SELECT 
    mp.user_id,
    mp.player_type,
    mp.guest_player_id,
    mp.team,
    mp.match_id,
    m.winner_team_id,
    m.team1_id,
    m.team2_id,
    m.played_at,
    DATE(m.played_at) as match_date
  FROM match_participants mp
  INNER JOIN matches m ON m.id = mp.match_id
  WHERE m.winner_team_id IS NOT NULL 
    AND m.team1_id IS NOT NULL 
    AND m.team2_id IS NOT NULL
    -- Filtrer pour ne compter que les matchs où le joueur était un user authentifié
    AND mp.player_type = 'user'
),
ranked_matches AS (
  -- Ajouter un numéro de rang pour chaque match d'un joueur dans la journée
  SELECT 
    ps.*,
    ROW_NUMBER() OVER (
      PARTITION BY ps.user_id, ps.match_date 
      ORDER BY ps.played_at ASC
    ) as match_rank_in_day
  FROM player_stats ps
),
filtered_matches AS (
  -- Ne garder que les 2 premiers matchs de chaque joueur par jour
  SELECT *
  FROM ranked_matches
  WHERE match_rank_in_day <= 2
),
player_results AS (
  SELECT 
    CASE 
      WHEN fm.player_type = 'guest' AND fm.guest_player_id IS NOT NULL 
      THEN 'guest_' || fm.guest_player_id::text
      ELSE fm.user_id::text
    END AS player_id,
    fm.user_id AS user_uuid,
    CASE 
      WHEN fm.player_type = 'guest' THEN 
        COALESCE(gp.first_name || ' ' || gp.last_name, 'Guest Player')
      ELSE 
        COALESCE(p.display_name, 'Player')
    END AS name,
    CASE 
      WHEN (fm.winner_team_id = fm.team1_id AND fm.team = 1) OR 
           (fm.winner_team_id = fm.team2_id AND fm.team = 2) 
      THEN 1 
      ELSE 0 
    END AS win,
    1 AS match_count
  FROM filtered_matches fm
  LEFT JOIN profiles p ON p.id = fm.user_id AND fm.player_type = 'user'
  LEFT JOIN guest_players gp ON gp.id = fm.guest_player_id AND fm.player_type = 'guest'
)
SELECT 
  player_id AS user_id,
  name AS player_name,
  name,
  SUM(win)::integer AS wins,
  SUM(match_count)::integer - SUM(win)::integer AS losses,
  SUM(match_count)::integer AS matches,
  (
    (SUM(win) * 10 + (SUM(match_count) - SUM(win)) * 3)
    + COALESCE(MAX(CASE WHEN r.id IS NOT NULL THEN 10 ELSE 0 END), 0)
  )::integer AS points,
  CASE 
    WHEN (((SUM(win) * 10 + (SUM(match_count) - SUM(win)) * 3)) + COALESCE(MAX(CASE WHEN r.id IS NOT NULL THEN 10 ELSE 0 END), 0)) >= 500 THEN 'Champion'
    WHEN (((SUM(win) * 10 + (SUM(match_count) - SUM(win)) * 3)) + COALESCE(MAX(CASE WHEN r.id IS NOT NULL THEN 10 ELSE 0 END), 0)) >= 300 THEN 'Diamant'
    WHEN (((SUM(win) * 10 + (SUM(match_count) - SUM(win)) * 3)) + COALESCE(MAX(CASE WHEN r.id IS NOT NULL THEN 10 ELSE 0 END), 0)) >= 200 THEN 'Or'
    WHEN (((SUM(win) * 10 + (SUM(match_count) - SUM(win)) * 3)) + COALESCE(MAX(CASE WHEN r.id IS NOT NULL THEN 10 ELSE 0 END), 0)) >= 100 THEN 'Argent'
    ELSE 'Bronze'
  END AS tier
FROM player_results pr
LEFT JOIN reviews r ON r.user_id = pr.user_uuid
GROUP BY player_id, name, pr.user_uuid
ORDER BY points DESC, wins DESC, matches DESC;

