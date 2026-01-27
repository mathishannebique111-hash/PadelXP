-- Migration: Système de classement dynamique (Elo V4 Adapté)
-- Correction: Gestion des dépendances de vue (suggested_pairs ET suggested_partners)

-- 1. Suppression des vues dépendantes
-- =========================================
DROP VIEW IF EXISTS suggested_pairs CASCADE;
DROP VIEW IF EXISTS suggested_partners CASCADE;

-- 2. Modification des structures de tables
-- =========================================
-- Profiles: Plus de précision pour le niveau et compteur de matchs joués
ALTER TABLE profiles 
ALTER COLUMN niveau_padel TYPE DECIMAL(4,2);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS matchs_joues INTEGER DEFAULT 0;

-- Match Participants: Historique des variations de niveau
ALTER TABLE match_participants 
ADD COLUMN IF NOT EXISTS level_before DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS level_after DECIMAL(4,2),
ADD COLUMN IF NOT EXISTS level_change DECIMAL(4,2);


-- 3. Recreation de la vue suggested_partners (Copie depuis create_suggested_partners_view.sql)
-- =========================================
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
    p.niveau_padel as level, -- Ne pas utiliser COALESCE, on veut garder NULL pour filtrer
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
    
    -- Score de compatibilité (sans player_partnerships)
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
    AND p1.club_id = p2.club_id
    -- Les deux joueurs doivent avoir complété le questionnaire (niveau_padel non NULL)
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


-- 4. Recreation de la vue suggested_pairs (Copie depuis improve_partner_suggestions.sql)
-- =========================================
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
COMMENT ON VIEW suggested_pairs IS 'Suggestions de paires ultra-qualitatives : niveau max ±1.0, score multi-critères';


-- 5. Fonction de calcul ELO
-- =========================================
CREATE OR REPLACE FUNCTION calculate_elo_ranking()
RETURNS TRIGGER AS $$
DECLARE
    -- Variables pour les équipes
    team1_ids UUID[];
    team2_ids UUID[];
    avg_level_team1 DECIMAL(4,2) := 4.30;
    avg_level_team2 DECIMAL(4,2) := 4.30;
    
    -- Variables de boucle et calcul
    current_level DECIMAL(4,2);
    player_matchs_count INTEGER;
    
    opp_avg DECIMAL(4,2);
    win_prob DECIMAL(4,2);
    k_factor DECIMAL(4,2);
    actual_score DECIMAL(4,2);
    level_diff DECIMAL(4,2);
    new_level DECIMAL(4,2);
    
    -- Curseurs
    participant RECORD;
BEGIN
    RAISE LOG 'Elo Ranking Trigger (Guest V4.3). Match ID: %, Status: % -> %', NEW.id, OLD.status, NEW.status;

    IF NEW.status = 'confirmed' AND OLD.status <> 'confirmed' THEN
    
        -- A. Calcul des moyennes d'équipe (Inclus Invités avec niveau 4.30 par défaut)
        
        SELECT ARRAY_AGG(user_id), AVG(COALESCE(p.niveau_padel, 4.30))
        INTO team1_ids, avg_level_team1
        FROM match_participants mp
        LEFT JOIN profiles p ON p.id = mp.user_id
        WHERE mp.match_id = NEW.id AND mp.team = 1;

        SELECT ARRAY_AGG(user_id), AVG(COALESCE(p.niveau_padel, 4.30))
        INTO team2_ids, avg_level_team2
        FROM match_participants mp
        LEFT JOIN profiles p ON p.id = mp.user_id
        WHERE mp.match_id = NEW.id AND mp.team = 2;

        -- Sécurité
        IF team1_ids IS NULL OR team2_ids IS NULL THEN
            RETURN NEW;
        END IF;

        -- B. Boucle de mise à jour (Uniquement pour les vrais joueurs)
        FOR participant IN 
            SELECT mp.user_id, mp.team, mp.player_type, p.niveau_padel, p.matchs_joues
            FROM match_participants mp
            LEFT JOIN profiles p ON p.id = mp.user_id
            WHERE mp.match_id = NEW.id
        LOOP
            -- IGNORER LES INVITÉS pour la mise à jour
            IF participant.player_type = 'guest' OR participant.user_id IS NULL OR participant.niveau_padel IS NULL THEN
                CONTINUE; 
            END IF;

            -- 1. Déterminer le score
            IF participant.team = 1 THEN
                opp_avg := avg_level_team2;
                IF NEW.winner_team_id IS NOT NULL AND NEW.winner_team_id = NEW.team1_id THEN actual_score := 1.0; ELSE actual_score := 0.0; END IF;
            ELSE
                opp_avg := avg_level_team1;
                IF NEW.winner_team_id IS NOT NULL AND NEW.winner_team_id = NEW.team2_id THEN actual_score := 1.0; ELSE actual_score := 0.0; END IF;
            END IF;

            -- 2. Paramètres joueur
            current_level := participant.niveau_padel;
            player_matchs_count := COALESCE(participant.matchs_joues, 0);

            -- 3. Elo
            win_prob := 1.0 / (1.0 + power(10.0, (opp_avg - current_level) / 2.0));

            -- 4. K-Factor
            IF player_matchs_count < 10 THEN k_factor := 0.50;
            ELSIF player_matchs_count < 20 THEN k_factor := 0.25;
            ELSE k_factor := 0.15; END IF;

            -- 5. Delta
            level_diff := k_factor * (actual_score - win_prob);
            new_level := current_level + level_diff;

            -- Bornes
            IF new_level < 0 THEN new_level := 0; END IF;
            IF new_level > 10 THEN new_level := 10; END IF;

            -- 6. Update
            UPDATE match_participants
            SET level_before = current_level, level_after = new_level, level_change = level_diff
            WHERE match_id = NEW.id AND user_id = participant.user_id;

            UPDATE profiles
            SET niveau_padel = new_level, matchs_joues = player_matchs_count + 1
            WHERE id = participant.user_id;
            
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Création du Trigger
-- =========================================
DROP TRIGGER IF EXISTS trigger_calculate_elo_ranking ON matches;

CREATE TRIGGER trigger_calculate_elo_ranking
AFTER UPDATE OF status ON matches
FOR EACH ROW
WHEN (NEW.status = 'confirmed' AND OLD.status <> 'confirmed')
EXECUTE FUNCTION calculate_elo_ranking();
