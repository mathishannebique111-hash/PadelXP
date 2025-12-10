-- Sécurité : ajouter temporairement les colonnes héritées attendues par d’anciens triggers
-- pour éviter l’erreur « record "new" has no field "player1_id" » lors de l’insert.
-- Colonnes ajoutées en nullable pour ne pas impacter le nouveau modèle basé sur match_participants.

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS player1_id uuid NULL,
  ADD COLUMN IF NOT EXISTS player2_id uuid NULL;

COMMENT ON COLUMN matches.player1_id IS 'Colonne héritée (nullable) pour compatibilité avec anciens triggers';
COMMENT ON COLUMN matches.player2_id IS 'Colonne héritée (nullable) pour compatibilité avec anciens triggers';

