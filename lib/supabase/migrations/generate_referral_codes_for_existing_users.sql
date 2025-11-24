-- Migration : Générer des codes de parrainage pour les utilisateurs existants
-- Date : 2025-01-XX
-- À exécuter après create_referral_system.sql

-- Générer des codes de parrainage pour tous les profils qui n'en ont pas encore
UPDATE public.profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL OR referral_code = '';

-- Vérifier qu'il n'y a pas de doublons (sécurité)
-- Si des doublons existent, les régénérer
DO $$
DECLARE
  duplicate_code TEXT;
BEGIN
  -- Trouver les codes en double
  FOR duplicate_code IN
    SELECT referral_code
    FROM public.profiles
    WHERE referral_code IS NOT NULL
    GROUP BY referral_code
    HAVING COUNT(*) > 1
  LOOP
    -- Régénérer un code unique pour chaque doublon (sauf le premier)
    UPDATE public.profiles
    SET referral_code = generate_referral_code()
    WHERE referral_code = duplicate_code
      AND id NOT IN (
        SELECT id
        FROM public.profiles
        WHERE referral_code = duplicate_code
        LIMIT 1
      );
  END LOOP;
END $$;

-- Vérification finale : s'assurer que tous les profils ont un code unique
DO $$
DECLARE
  profiles_without_code INTEGER;
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profiles_without_code
  FROM public.profiles
  WHERE referral_code IS NULL OR referral_code = '';

  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT referral_code
    FROM public.profiles
    WHERE referral_code IS NOT NULL
    GROUP BY referral_code
    HAVING COUNT(*) > 1
  ) duplicates;

  IF profiles_without_code > 0 THEN
    RAISE NOTICE 'ATTENTION: % profils sans code de parrainage', profiles_without_code;
  END IF;

  IF duplicate_count > 0 THEN
    RAISE WARNING 'ATTENTION: % codes de parrainage en double détectés', duplicate_count;
  ELSE
    RAISE NOTICE 'SUCCÈS: Tous les profils ont un code de parrainage unique';
  END IF;
END $$;

