-- Augmenter la précision de la colonne niveau_padel pour supporter 2 décimales (ex: 6.33)
ALTER TABLE profiles ALTER COLUMN niveau_padel TYPE DECIMAL(4,2);

COMMENT ON COLUMN profiles.niveau_padel IS 'Niveau de padel (1.00 à 10.00)';
