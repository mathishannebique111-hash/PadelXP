-- Migration : Ajouter le champ tableau pour le TMC
-- Ce champ permet de distinguer les 4 tableaux du TMC 16 équipes

ALTER TABLE tournament_matches
ADD COLUMN IF NOT EXISTS tableau VARCHAR(50) CHECK (tableau IN (
  'principal', 'places_5_8', 'places_9_12', 'places_13_16', 'places_9_16'
) OR tableau IS NULL);

-- Index pour améliorer les performances des requêtes par tableau
CREATE INDEX IF NOT EXISTS idx_matches_tableau ON tournament_matches(tableau);

COMMENT ON COLUMN tournament_matches.tableau IS 'Tableau du TMC : principal, places_5_8, places_9_12, places_13_16, ou places_9_16 (temporaire pour le Tour 2)';

