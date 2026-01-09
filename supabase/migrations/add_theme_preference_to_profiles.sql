-- Migration: Ajouter la colonne theme_preference à la table profiles
-- Valeur par défaut: 'dark' (design actuel)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light'));

-- Commentaire
COMMENT ON COLUMN profiles.theme_preference IS 'Préférence de thème utilisateur: dark (par défaut) ou light';
