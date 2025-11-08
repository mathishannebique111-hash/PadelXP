-- Drop existing view if it exists
DROP VIEW IF EXISTS public.leaderboard;

-- Create new leaderboard view using the new schema (winner_team_id, team1_id, team2_id)
-- IMPORTANT: Ne compte que les matchs où player_type = 'user' (comme PlayerSummary)
-- et ignore les matchs non terminés (sans winner_team_id)
CREATE OR REPLACE VIEW public.leaderboard AS
WITH player_stats AS (
  SELECT 
    mp.user_id,
    mp.player_type,
    mp.guest_player_id,
    mp.team,
    m.winner_team_id,
    m.team1_id,
    m.team2_id
  FROM match_participants mp
  INNER JOIN matches m ON m.id = mp.match_id
  WHERE m.winner_team_id IS NOT NULL 
    AND m.team1_id IS NOT NULL 
    AND m.team2_id IS NOT NULL
    -- Filtrer pour ne compter que les matchs où le joueur était un user authentifié
    -- (comme PlayerSummary qui fait .eq("player_type", "user"))
    AND mp.player_type = 'user'
),
player_results AS (
  SELECT 
    CASE 
      WHEN ps.player_type = 'guest' AND ps.guest_player_id IS NOT NULL 
      THEN 'guest_' || ps.guest_player_id::text
      ELSE ps.user_id::text
    END AS player_id,
    ps.user_id AS user_uuid,
    CASE 
      WHEN ps.player_type = 'guest' THEN 
        COALESCE(gp.first_name || ' ' || gp.last_name, 'Guest Player')
      ELSE 
        COALESCE(p.display_name, 'Player')
    END AS name,
    CASE 
      WHEN (ps.winner_team_id = ps.team1_id AND ps.team = 1) OR 
           (ps.winner_team_id = ps.team2_id AND ps.team = 2) 
      THEN 1 
      ELSE 0 
    END AS win,
    1 AS match_count
  FROM player_stats ps
  LEFT JOIN profiles p ON p.id = ps.user_id AND ps.player_type = 'user'
  LEFT JOIN guest_players gp ON gp.id = ps.guest_player_id AND ps.player_type = 'guest'
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

