-- ============================================
-- FIX: Supprimer les contraintes de clés étrangères pour team1_id et team2_id
-- ============================================
-- Ce script supprime les contraintes de clés étrangères qui empêchent l'insertion
-- car team1_id et team2_id sont des UUIDs générés, pas des références à une table teams

-- 1. Vérifier les contraintes existantes
-- ============================================
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'matches'
  AND (kcu.column_name = 'team1_id' OR kcu.column_name = 'team2_id' OR kcu.column_name = 'winner_team_id');

-- 2. Supprimer la contrainte pour team1_id si elle existe
-- ============================================
DO $$ 
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Trouver le nom de la contrainte pour team1_id
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'matches'
      AND kcu.column_name = 'team1_id'
      AND tc.table_schema = 'public'
    LIMIT 1;
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
        RAISE NOTICE 'Contrainte supprimée pour team1_id: %', constraint_name_var;
    ELSE
        RAISE NOTICE 'Aucune contrainte trouvée pour team1_id';
    END IF;
END $$;

-- 3. Supprimer la contrainte pour team2_id si elle existe
-- ============================================
DO $$ 
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Trouver le nom de la contrainte pour team2_id
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'matches'
      AND kcu.column_name = 'team2_id'
      AND tc.table_schema = 'public'
    LIMIT 1;
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
        RAISE NOTICE 'Contrainte supprimée pour team2_id: %', constraint_name_var;
    ELSE
        RAISE NOTICE 'Aucune contrainte trouvée pour team2_id';
    END IF;
END $$;

-- 4. Supprimer la contrainte pour winner_team_id si elle existe (optionnel)
-- ============================================
DO $$ 
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Trouver le nom de la contrainte pour winner_team_id
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'matches'
      AND kcu.column_name = 'winner_team_id'
      AND tc.table_schema = 'public'
    LIMIT 1;
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
        RAISE NOTICE 'Contrainte supprimée pour winner_team_id: %', constraint_name_var;
    ELSE
        RAISE NOTICE 'Aucune contrainte trouvée pour winner_team_id';
    END IF;
END $$;

-- 5. Vérifier que les contraintes ont été supprimées
-- ============================================
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'matches'
  AND (kcu.column_name = 'team1_id' OR kcu.column_name = 'team2_id' OR kcu.column_name = 'winner_team_id');

-- Si aucune ligne n'est retournée, les contraintes ont été supprimées avec succès ✅

