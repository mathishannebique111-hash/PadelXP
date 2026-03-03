-- ============================================
-- WHITE-LABEL BRANDING COLUMNS FOR CLUBS
-- ============================================
-- Ajoute les colonnes nécessaires pour la personnalisation
-- de chaque club (couleurs, sous-domaine, features activées).

-- 1. Sous-domaine unique pour chaque club (ex: "amiens" -> amiens.padelxp.eu)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;

-- 2. Couleurs de branding
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#0066FF';
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#CCFF00';
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#172554';

-- 3. URL de la bannière du club (en plus du logo_url existant)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 4. Features activées par club (permet de désactiver des modules comme les réservations)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS enabled_features JSONB DEFAULT '{"rankings": true, "challenges": true, "reservations": false, "boost": true, "leagues": true}'::jsonb;

-- 5. Lien externe de réservation (Playtomic, BalleJaune, etc.)
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS external_booking_url TEXT;

-- 6. Index pour lookup rapide par sous-domaine
CREATE INDEX IF NOT EXISTS idx_clubs_subdomain ON public.clubs(subdomain);

-- 7. Confirmation
DO $$
BEGIN
  RAISE NOTICE 'White-label branding columns added to clubs table successfully.';
END $$;
