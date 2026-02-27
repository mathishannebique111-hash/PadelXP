-- Migration : Restaurer le déclencheur de code de parrainage
-- Date : 2026-02-27

-- 1. Recréer la fonction de génération (au cas où elle aurait été supprimée)
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

-- 2. Recréer la fonction du trigger
CREATE OR REPLACE FUNCTION set_referral_code_if_null()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attacher le trigger
DROP TRIGGER IF EXISTS trigger_set_referral_code ON public.profiles;
CREATE TRIGGER trigger_set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL OR NEW.referral_code = '')
  EXECUTE FUNCTION set_referral_code_if_null();
