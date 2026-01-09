-- Ajouter colonne pour les recommandations
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS niveau_recommendations TEXT[];

-- Commentaire
COMMENT ON COLUMN profiles.niveau_recommendations IS 'Liste des recommandations personnalisées';
