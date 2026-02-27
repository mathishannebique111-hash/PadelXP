-- Migration: Mise à jour de la logique de niveau pour les invités/anonymes
-- Les invités prennent désormais le niveau moyen des joueurs réels du match.

CREATE OR REPLACE FUNCTION calculate_elo_ranking()
RETURNS TRIGGER AS $$
DECLARE
    -- Variables pour les équipes
    team1_ids UUID[];
    team2_ids UUID[];
    avg_level_team1 DECIMAL(4,2) := 5.0;
    avg_level_team2 DECIMAL(4,2) := 5.0;
    avg_real_players DECIMAL(4,2) := 5.0;
    
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
    RAISE LOG 'Elo Ranking Trigger (Guest Avg Logic). Match ID: %, Status: % -> %', NEW.id, OLD.status, NEW.status;

    IF NEW.status = 'confirmed' AND OLD.status <> 'confirmed' THEN
    
        -- 1. Calculer le niveau moyen des joueurs réels (users) présents dans le match
        SELECT AVG(COALESCE(p.niveau_padel, 5.0))
        INTO avg_real_players
        FROM match_participants mp
        JOIN profiles p ON p.id = mp.user_id
        WHERE mp.match_id = NEW.id AND mp.player_type = 'user';

        -- Valeur de secours si aucun joueur réel n'est trouvé (ne devrait pas arriver)
        IF avg_real_players IS NULL THEN
            avg_real_players := 5.0;
        END IF;

        RAISE LOG 'Calculated average of real players: %', avg_real_players;

        -- 2. Calcul des moyennes d'équipe
        -- On utilise avg_real_players comme valeur par défaut pour les invités/anonymes
        
        SELECT AVG(COALESCE(p.niveau_padel, avg_real_players))
        INTO avg_level_team1
        FROM match_participants mp
        LEFT JOIN profiles p ON p.id = mp.user_id
        WHERE mp.match_id = NEW.id AND mp.team = 1;

        SELECT AVG(COALESCE(p.niveau_padel, avg_real_players))
        INTO avg_level_team2
        FROM match_participants mp
        LEFT JOIN profiles p ON p.id = mp.user_id
        WHERE mp.match_id = NEW.id AND mp.team = 2;

        RAISE LOG 'Team Averages - Team 1: %, Team 2: %', avg_level_team1, avg_level_team2;

        -- Sécurité : s'assurer qu'on a bien des moyennes calculées
        IF avg_level_team1 IS NULL THEN avg_level_team1 := avg_real_players; END IF;
        IF avg_level_team2 IS NULL THEN avg_level_team2 := avg_real_players; END IF;

        -- 3. Boucle de mise à jour (Uniquement pour les joueurs enregistrés)
        FOR participant IN 
            SELECT mp.user_id, mp.team, mp.player_type, p.niveau_padel, p.matchs_joues
            FROM match_participants mp
            JOIN profiles p ON p.id = mp.user_id
            WHERE mp.match_id = NEW.id AND mp.player_type = 'user'
        LOOP
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

            RAISE LOG 'Updating User %: Team %, Level % -> %, diff: %', participant.user_id, participant.team, current_level, new_level, level_diff;

            -- 6. Update base
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
