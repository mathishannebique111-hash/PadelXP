-- Migration: Système Multi-Clubs - Phase 1.4
-- Ajouter les nouveaux champs sur la table matches

-- 1. Ajouter le champ location_club_id (club où le match a eu lieu)
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS location_club_id UUID;

-- 2. Ajouter le champ is_registered_club (true = clubs inscrits, false = unregistered_clubs)
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS is_registered_club BOOLEAN DEFAULT true;

-- 3. Ajouter le champ opponent_type (type d'adversaire)
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS opponent_type TEXT CHECK (opponent_type IN ('membre_club', 'membre_externe', 'invite_fantome'));

-- 4. Ajouter le champ opponent_phone_hash (hash pour détection inscription - RGPD compliant)
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS opponent_phone_hash TEXT;

-- 5. Ajouter le champ validation_token (token pour validation par email)
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS validation_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Index pour les requêtes par lieu
CREATE INDEX IF NOT EXISTS idx_matches_location_club_id ON matches(location_club_id);

-- Index pour filtrer les matchs dans les clubs inscrits vs non-inscrits
CREATE INDEX IF NOT EXISTS idx_matches_is_registered_club ON matches(is_registered_club);

-- Index sur validation_token pour la validation par email
CREATE INDEX IF NOT EXISTS idx_matches_validation_token ON matches(validation_token);

-- Commentaires pour documentation
COMMENT ON COLUMN matches.location_club_id IS 'ID du club où le match a eu lieu (référence clubs OU unregistered_clubs selon is_registered_club)';
COMMENT ON COLUMN matches.is_registered_club IS 'true = club inscrit (table clubs), false = club non-inscrit (table unregistered_clubs)';
COMMENT ON COLUMN matches.opponent_type IS 'Type d''adversaire: membre_club, membre_externe, ou invite_fantome';
COMMENT ON COLUMN matches.opponent_phone_hash IS 'Hash SHA256 du téléphone si joueur fantôme (RGPD: pseudonymisé)';
COMMENT ON COLUMN matches.validation_token IS 'Token unique pour validation du match par email';
