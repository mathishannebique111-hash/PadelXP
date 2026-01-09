-- Ajouter colonnes niveau padel
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS niveau_padel DECIMAL(3,1);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS niveau_categorie TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS niveau_breakdown JSONB;

-- Index pour les requêtes sur le niveau
CREATE INDEX IF NOT EXISTS idx_profiles_niveau_padel ON profiles(niveau_padel);

-- Commentaires
COMMENT ON COLUMN profiles.niveau_padel IS 'Niveau de padel (1.0 à 10.0)';
COMMENT ON COLUMN profiles.niveau_categorie IS 'Catégorie (Débutant, Confirmé, etc.)';
COMMENT ON COLUMN profiles.niveau_breakdown IS 'Détails par catégorie (JSON)';

