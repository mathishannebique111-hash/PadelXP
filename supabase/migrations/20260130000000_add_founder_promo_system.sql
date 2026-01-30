-- ============================================
-- MIGRATION: Système de Code Promo Fondateur
-- ============================================
-- Ajoute la distinction Fondateur vs Standard via offer_type
-- et la table promo_codes pour gérer FONDATIONLANCEMENT26

-- 1. Ajouter la colonne offer_type à la table clubs
ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS offer_type TEXT DEFAULT 'standard' 
CHECK (offer_type IN ('standard', 'founder'));

-- 2. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_clubs_offer_type ON clubs(offer_type);

-- 3. Créer la table promo_codes
CREATE TABLE IF NOT EXISTS promo_codes (
  code TEXT PRIMARY KEY,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('standard', 'founder')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ajouter le code promo initial FONDATIONLANCEMENT26
INSERT INTO promo_codes (code, offer_type, active) 
VALUES ('FONDATIONLANCEMENT26', 'founder', true)
ON CONFLICT (code) DO NOTHING;

-- 5. Commentaires pour documentation
COMMENT ON COLUMN clubs.offer_type IS 'Type d''offre du club : standard (49€/mois) ou founder (39€/mois)';
COMMENT ON TABLE promo_codes IS 'Codes promo pour attribuer des offres spéciales lors de l''inscription';
COMMENT ON COLUMN promo_codes.code IS 'Code promo (ex: FONDATIONLANCEMENT26)';
COMMENT ON COLUMN promo_codes.offer_type IS 'Type d''offre associé au code promo';
COMMENT ON COLUMN promo_codes.active IS 'Si false, le code ne peut plus être utilisé';

-- 6. Activer RLS sur la table promo_codes
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- 7. Policy : Permettre la lecture publique des codes actifs (pour validation côté signup)
CREATE POLICY "Anyone can read active promo codes"
  ON promo_codes
  FOR SELECT
  USING (active = true);

-- 8. Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_promo_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_promo_codes_updated_at();
