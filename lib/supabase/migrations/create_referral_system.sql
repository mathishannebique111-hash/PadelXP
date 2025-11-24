-- Migration : Création du système de parrainage
-- Date : 2025-01-XX

-- 1. Ajouter les colonnes referral_code et referral_count à la table profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0 CHECK (referral_count >= 0 AND referral_count <= 2);

-- Index pour rechercher rapidement par code de parrainage
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code 
  ON public.profiles(referral_code) 
  WHERE referral_code IS NOT NULL;

-- Index pour les recherches de referral_count
CREATE INDEX IF NOT EXISTS idx_profiles_referral_count 
  ON public.profiles(referral_count) 
  WHERE referral_count < 2;

-- 2. Créer la table referrals pour enregistrer les relations parrain/filleul
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code_used TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  referrer_boost_awarded BOOLEAN DEFAULT FALSE,
  referred_boost_awarded BOOLEAN DEFAULT FALSE,
  
  -- Un filleul ne peut utiliser qu'un seul code de parrainage
  UNIQUE(referred_id),
  
  -- Un parrain ne peut parrainer qu'un même filleul une seule fois (déjà garanti par UNIQUE(referred_id))
  CONSTRAINT check_no_self_referral CHECK (referrer_id != referred_id)
);

-- Index pour chercher rapidement les filleuls d'un parrain
CREATE INDEX IF NOT EXISTS idx_referrals_referrer 
  ON public.referrals(referrer_id);

-- Index pour chercher le parrain d'un filleul
CREATE INDEX IF NOT EXISTS idx_referrals_referred 
  ON public.referrals(referred_id);

-- Index pour chercher par code utilisé
CREATE INDEX IF NOT EXISTS idx_referrals_code 
  ON public.referrals(referral_code_used);

-- 3. Fonction pour générer un code de parrainage unique (6-8 caractères alphanumériques)
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclure les caractères ambigus (0, O, I, 1)
  code TEXT := '';
  i INTEGER;
  char_index INTEGER;
BEGIN
  -- Générer un code de 6 caractères
  FOR i IN 1..6 LOOP
    char_index := floor(random() * length(chars) + 1)::INTEGER;
    code := code || substr(chars, char_index, 1);
  END LOOP;
  
  -- Vérifier l'unicité (si le code existe déjà, en générer un nouveau)
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code) LOOP
    code := '';
    FOR i IN 1..6 LOOP
      char_index := floor(random() * length(chars) + 1)::INTEGER;
      code := code || substr(chars, char_index, 1);
    END LOOP;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger pour générer automatiquement un code de parrainage lors de la création d'un profil
-- (si aucun code n'est fourni)
CREATE OR REPLACE FUNCTION set_referral_code_if_null()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_referral_code ON public.profiles;
CREATE TRIGGER trigger_set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL OR NEW.referral_code = '')
  EXECUTE FUNCTION set_referral_code_if_null();

-- 5. RLS Policies pour referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres relations de parrainage (en tant que parrain ou filleul)
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Les admins peuvent voir toutes les relations (via service_role)
-- Pas de politique INSERT pour les utilisateurs normaux (géré via API avec service_role)

-- 6. Commentaires pour documentation
COMMENT ON COLUMN public.profiles.referral_code IS 'Code de parrainage unique (6 caractères alphanumériques) généré automatiquement';
COMMENT ON COLUMN public.profiles.referral_count IS 'Nombre de filleuls parrainés (limite de 2)';
COMMENT ON TABLE public.referrals IS 'Enregistre les relations parrain/filleul et l''attribution des boosts';
COMMENT ON COLUMN public.referrals.referrer_boost_awarded IS 'Indique si le boost a été attribué au parrain';
COMMENT ON COLUMN public.referrals.referred_boost_awarded IS 'Indique si le boost a été attribué au filleul';

