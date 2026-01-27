-- Migration de correction
-- Problème: La fonction calculate_elo_ranking utilisait 'team1' (string) au lieu de 1 (integer) pour la colonne team.
-- Conséquence: Le trigger ne trouvait aucun participant et s'arrêtait.

CREATE OR REPLACE FUNCTION calculate_elo_ranking()
RETURNS TRIGGER AS $$
DECLARE
    -- Variables pour les équipes
    team1_ids UUID[];
    team2_ids UUID[];
    avg_level_team1 DECIMAL(4,2) := 0;
    avg_level_team2 DECIMAL(4,2) := 0;
    
    -- Variables de boucle et calcul
    player_id UUID;
    current_level DECIMAL(4,2);
    player_matchs_count INTEGER;
    
    opp_avg DECIMAL(4,2); -- Moyenne de l'équipe adverse
    win_prob DECIMAL(4,2); -- Probabilité de victoire (Espérance)
    k_factor DECIMAL(4,2); -- Facteur K (Vélocité)
    actual_score DECIMAL(4,2); -- 1 pour victoire, 0 pour défaite
    level_diff DECIMAL(4,2); -- Différence calculée
    new_level DECIMAL(4,2); -- Nouveau niveau
    
    -- Curseurs
    participant RECORD;
BEGIN
    -- LOG DEBUG
    RAISE LOG 'Elo Ranking Trigger Called (Fixed V3). Match ID: %, Status: % -> %', NEW.id, OLD.status, NEW.status;

    -- Uniquement si le match vient de se terminer
    IF NEW.status = 'confirmed' AND OLD.status <> 'confirmed' THEN
    
        RAISE LOG 'Status change detected: pending -> confirmed. Starting Elo calculation...';

        -- A. Récupérer les compositions d'équipes et calculer les moyennes
        
        -- Récupérer les IDs et niveaux pour l'équipe 1 (TEAM 1 = Integer 1)
        SELECT ARRAY_AGG(user_id), AVG(COALESCE(niveau_padel, 5.0))
        INTO team1_ids, avg_level_team1
        FROM match_participants mp
        JOIN profiles p ON p.id = mp.user_id
        WHERE mp.match_id = NEW.id AND mp.team = 1;

        RAISE LOG 'Team 1: IDs: %, Avg: %', team1_ids, avg_level_team1;

        -- Récupérer les IDs et niveaux pour l'équipe 2 (TEAM 2 = Integer 2)
        SELECT ARRAY_AGG(user_id), AVG(COALESCE(niveau_padel, 5.0))
        INTO team2_ids, avg_level_team2
        FROM match_participants mp
        JOIN profiles p ON p.id = mp.user_id
        WHERE mp.match_id = NEW.id AND mp.team = 2;

        RAISE LOG 'Team 2: IDs: %, Avg: %', team2_ids, avg_level_team2;

        -- Si on n'a pas 4 joueurs (ou au moins 1 par équipe), on annule le calcul (sécurité)
        IF team1_ids IS NULL OR team2_ids IS NULL THEN
             RAISE LOG 'Calcul annulé : équipes incomplètes (Team1: %, Team2: %)', team1_ids, team2_ids;
            RETURN NEW;
        END IF;

        -- B. Boucle sur tous les participants pour mise à jour individuelle
        FOR participant IN 
            SELECT mp.user_id, mp.team, p.niveau_padel, p.matchs_joues
            FROM match_participants mp
            JOIN profiles p ON p.id = mp.user_id
            WHERE mp.match_id = NEW.id
        LOOP
            -- 1. Déterminer le camp et le résultat
            -- Attention: mp.team est INTEGER (1 ou 2)
            IF participant.team = 1 THEN
                opp_avg := avg_level_team2;
                -- Correction: Utiliser winner_team_id
                IF NEW.winner_team_id IS NOT NULL AND NEW.winner_team_id = NEW.team1_id THEN 
                    actual_score := 1.0; 
                ELSE 
                    actual_score := 0.0; 
                END IF;
            ELSE
                opp_avg := avg_level_team1;
                -- Correction: Utiliser winner_team_id
                IF NEW.winner_team_id IS NOT NULL AND NEW.winner_team_id = NEW.team2_id THEN 
                    actual_score := 1.0; 
                ELSE 
                    actual_score := 0.0; 
                END IF;
            END IF;

            -- LOG DEBUG WINNER
            RAISE LOG 'Player: %, Team: %, Actual Score: % (WinnerID: % vs T1: % / T2: %)', 
                participant.user_id, participant.team, actual_score, NEW.winner_team_id, NEW.team1_id, NEW.team2_id;

            -- Valeur par défaut si niveau null
            IF participant.niveau_padel IS NULL THEN
                current_level := 5.0; -- Valeur par défaut safe
            ELSE
                current_level := participant.niveau_padel;
            END IF;
            
            IF participant.matchs_joues IS NULL THEN
                 player_matchs_count := 0;
            ELSE
                 player_matchs_count := participant.matchs_joues;
            END IF;

            -- 2. Calculer la probabilité de victoire (Formule Logistique)
            -- E = 1 / (1 + 10 ^ ((OppAvg - PlayerLevel) / 2))
            -- Note: Division par 2.0 pour l'échelle 1-10
            win_prob := 1.0 / (1.0 + power(10.0, (opp_avg - current_level) / 2.0));

            -- 3. Déterminer le facteur K (Phases)
            IF player_matchs_count < 10 THEN
                k_factor := 0.50; -- Calibration (x3.3)
            ELSIF player_matchs_count < 20 THEN
                k_factor := 0.25; -- Transition (x1.6)
            ELSE
                k_factor := 0.15; -- Croisière (x1.0)
            END IF;

            -- 4. Calculer la variation (Delta)
            level_diff := k_factor * (actual_score - win_prob);
            
            -- Calculer nouveau niveau
            new_level := current_level + level_diff;

            -- Bornes de sécurité (0 à 10)
            IF new_level < 0 THEN new_level := 0; END IF;
            IF new_level > 10 THEN new_level := 10; END IF;

            RAISE LOG 'Updating Player %: Level % -> %, diff: %, reason: (score: % - win_prob: %)', participant.user_id, current_level, new_level, level_diff, actual_score, win_prob;

            -- 5. Mises à jour en base
            
            -- Update Match Participant (Historique)
            UPDATE match_participants
            SET 
                level_before = current_level,
                level_after = new_level,
                level_change = level_diff
            WHERE match_id = NEW.id AND user_id = participant.user_id;

            -- Update Profile (Nouveau niveau + incrément compteur)
            UPDATE profiles
            SET 
                niveau_padel = new_level,
                matchs_joues = player_matchs_count + 1
            WHERE id = participant.user_id;
            
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
