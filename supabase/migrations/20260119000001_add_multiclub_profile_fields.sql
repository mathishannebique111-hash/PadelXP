-- Migration: Système Multi-Clubs - Phase 1.1
-- Ajouter les nouveaux champs sur la table profiles (users)
-- RGPD : phone_hash utilise SHA256 (pseudonymisation), pas de PII en clair

-- 1. Ajouter le champ username (identifiant public unique)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 2. Ajouter le champ global_points (points tous clubs confondus)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS global_points INTEGER DEFAULT 0;

-- 3. Ajouter le champ qr_code_token (token unique pour QR code)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS qr_code_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- 4. Ajouter le champ is_ghost (profil fantôme pour invitations)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_ghost BOOLEAN DEFAULT false;

-- 5. Ajouter le champ phone_hash (hash SHA256 du téléphone - RGPD compliant)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_hash TEXT;

-- 6. Créer un index sur username pour les recherches
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 7. Créer un index sur phone_hash pour la détection d'inscription
CREATE INDEX IF NOT EXISTS idx_profiles_phone_hash ON profiles(phone_hash);

-- 8. Créer un index sur is_ghost pour filtrer les profils fantômes
CREATE INDEX IF NOT EXISTS idx_profiles_is_ghost ON profiles(is_ghost);

-- Commentaires pour documentation
COMMENT ON COLUMN profiles.username IS 'Identifiant public unique du joueur (ex: @ThomasP_42)';
COMMENT ON COLUMN profiles.global_points IS 'Points accumulés sur tous les matchs, tous clubs confondus';
COMMENT ON COLUMN profiles.qr_code_token IS 'Token UUID unique pour générer le QR code de profil';
COMMENT ON COLUMN profiles.is_ghost IS 'True si le profil est un fantôme (invité non inscrit)';
COMMENT ON COLUMN profiles.phone_hash IS 'Hash SHA256 du numéro de téléphone pour détection inscription (RGPD: pseudonymisé)';
