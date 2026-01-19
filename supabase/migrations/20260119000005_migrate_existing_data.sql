-- Migration: Système Multi-Clubs - Phase 2
-- Migration des données existantes vers le nouveau système

-- =====================================================
-- ÉTAPE 1 : Copier les points existants vers global_points
-- =====================================================
UPDATE profiles
SET global_points = COALESCE(points, 0)
WHERE global_points = 0 OR global_points IS NULL;

-- =====================================================
-- ÉTAPE 2 : Créer les entrées user_clubs pour les joueurs existants
-- (avec leur club_id actuel comme club principal)
-- =====================================================
INSERT INTO user_clubs (user_id, club_id, role, club_points, joined_at)
SELECT 
    p.id AS user_id,
    p.club_id AS club_id,
    'principal' AS role,
    COALESCE(p.points, 0) AS club_points,
    COALESCE(p.created_at, NOW()) AS joined_at
FROM profiles p
WHERE p.club_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_clubs uc 
    WHERE uc.user_id = p.id AND uc.club_id = p.club_id
  );

-- =====================================================
-- ÉTAPE 3 : Générer les usernames pour les profils qui n'en ont pas
-- Format: @{prenom}{initiale_nom}{random_2_chiffres}
-- =====================================================

-- Fonction pour générer un username unique
CREATE OR REPLACE FUNCTION generate_unique_username(
    p_first_name TEXT,
    p_last_name TEXT
) RETURNS TEXT AS $$
DECLARE
    v_base_username TEXT;
    v_username TEXT;
    v_suffix INTEGER;
    v_exists BOOLEAN;
BEGIN
    -- Nettoyer et formater le prénom et nom
    v_base_username := '@' || 
        LOWER(REGEXP_REPLACE(COALESCE(p_first_name, 'user'), '[^a-zA-Z]', '', 'g')) ||
        UPPER(LEFT(COALESCE(p_last_name, 'X'), 1)) || '_';
    
    -- Commencer avec un suffixe aléatoire
    v_suffix := floor(random() * 90 + 10)::INTEGER; -- 10-99
    v_username := v_base_username || v_suffix::TEXT;
    
    -- Vérifier l'unicité et incrémenter si nécessaire
    LOOP
        SELECT EXISTS(SELECT 1 FROM profiles WHERE username = v_username) INTO v_exists;
        IF NOT v_exists THEN
            RETURN v_username;
        END IF;
        v_suffix := v_suffix + 1;
        IF v_suffix > 99 THEN
            v_suffix := 100 + floor(random() * 900)::INTEGER; -- 100-999
        END IF;
        v_username := v_base_username || v_suffix::TEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Appliquer la génération de username aux profils existants
DO $$
DECLARE
    r RECORD;
    v_new_username TEXT;
BEGIN
    FOR r IN 
        SELECT id, first_name, last_name 
        FROM profiles 
        WHERE username IS NULL
    LOOP
        v_new_username := generate_unique_username(r.first_name, r.last_name);
        UPDATE profiles SET username = v_new_username WHERE id = r.id;
    END LOOP;
END $$;

-- =====================================================
-- ÉTAPE 4 : Mettre à jour les matchs existants avec location_club_id
-- (utiliser le club du premier participant s'il n'est pas déjà défini)
-- =====================================================
UPDATE matches m
SET 
    location_club_id = (
        SELECT p.club_id 
        FROM match_participants mp
        JOIN profiles p ON p.id = mp.user_id
        WHERE mp.match_id = m.id 
          AND mp.player_type = 'user'
          AND p.club_id IS NOT NULL
        ORDER BY mp.team
        LIMIT 1
    ),
    is_registered_club = true,
    opponent_type = 'membre_club'
WHERE m.location_club_id IS NULL;

-- =====================================================
-- Vérification des résultats
-- =====================================================
-- Afficher les statistiques de migration
DO $$
DECLARE
    v_profiles_with_username INTEGER;
    v_profiles_with_global_points INTEGER;
    v_user_clubs_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_profiles_with_username FROM profiles WHERE username IS NOT NULL;
    SELECT COUNT(*) INTO v_profiles_with_global_points FROM profiles WHERE global_points > 0;
    SELECT COUNT(*) INTO v_user_clubs_count FROM user_clubs;
    
    RAISE NOTICE 'Migration terminée:';
    RAISE NOTICE '- Profils avec username: %', v_profiles_with_username;
    RAISE NOTICE '- Profils avec global_points > 0: %', v_profiles_with_global_points;
    RAISE NOTICE '- Entrées user_clubs créées: %', v_user_clubs_count;
END $$;
