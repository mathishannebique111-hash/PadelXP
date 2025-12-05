-- Migration : S'assurer que la colonne final_ranking existe dans tournament_registrations
-- Cette migration est idempotente et peut être exécutée plusieurs fois sans erreur

DO $$ 
BEGIN
  -- Vérifier si la colonne existe déjà
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tournament_registrations' 
      AND column_name = 'final_ranking'
  ) THEN
    -- Ajouter la colonne si elle n'existe pas
    ALTER TABLE tournament_registrations
    ADD COLUMN final_ranking INTEGER CHECK (final_ranking > 0 OR final_ranking IS NULL);
    
    -- Ajouter un index pour améliorer les performances
    CREATE INDEX IF NOT EXISTS idx_registrations_final_ranking 
    ON tournament_registrations(tournament_id, final_ranking);
    
    -- Ajouter un commentaire
    COMMENT ON COLUMN tournament_registrations.final_ranking IS 'Classement final dans le tournoi (1 = vainqueur, 2 = finaliste, etc.)';
    
    RAISE NOTICE 'Colonne final_ranking ajoutée à tournament_registrations';
  ELSE
    RAISE NOTICE 'Colonne final_ranking existe déjà dans tournament_registrations';
  END IF;
END $$;

