-- Migration : Mettre à jour la contrainte tableau pour supporter TMC 12 et TMC 20
-- Ajoute les valeurs manquantes pour les tableaux de classement

-- Supprimer l'ancienne contrainte
ALTER TABLE tournament_matches
DROP CONSTRAINT IF EXISTS tournament_matches_tableau_check;

-- Recréer la contrainte avec toutes les valeurs nécessaires
ALTER TABLE tournament_matches
ADD CONSTRAINT tournament_matches_tableau_check 
CHECK (tableau IN (
  -- Tableaux principaux
  'principal',
  -- TMC 8
  'places_5_8',
  -- TMC 12
  'places_4_6',
  'places_7_9',
  'places_10_12',
  'places_7_12',
  -- TMC 16
  'places_9_12',
  'places_13_16',
  'places_9_16',
  -- TMC 20
  'places_6_10',
  'places_11_15',
  'places_16_20',
  'places_11_20'
) OR tableau IS NULL);

-- Mettre à jour le commentaire
COMMENT ON COLUMN tournament_matches.tableau IS 'Tableau du TMC : principal, places_4_6, places_5_8, places_6_10, places_7_9, places_7_12, places_9_12, places_9_16, places_10_12, places_11_15, places_11_20, places_13_16, places_16_20';

