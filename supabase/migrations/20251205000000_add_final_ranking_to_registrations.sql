-- Migration : Ajouter le champ final_ranking pour stocker le classement final du tournoi

ALTER TABLE tournament_registrations
ADD COLUMN IF NOT EXISTS final_ranking INTEGER CHECK (final_ranking > 0 OR final_ranking IS NULL);

-- Index pour améliorer les performances des requêtes de classement
CREATE INDEX IF NOT EXISTS idx_registrations_final_ranking ON tournament_registrations(tournament_id, final_ranking);

COMMENT ON COLUMN tournament_registrations.final_ranking IS 'Classement final dans le tournoi (1 = vainqueur, 2 = finaliste, etc.)';

