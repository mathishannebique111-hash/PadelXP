-- ============================================
-- BACKFILL TCAM CLUB DATA
-- ============================================
-- Ce script normalise club_slug et renseigne club_id pour tous les profils du club TCAM
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Vérifier que le club TCAM existe
DO $$
DECLARE
  tcam_club_id UUID;
  tcam_club_slug TEXT;
BEGIN
  -- Chercher le club TCAM par différents slugs possibles
  SELECT id, slug INTO tcam_club_id, tcam_club_slug
  FROM public.clubs
  WHERE slug IN ('tcam80300', 'tcam', 'TCAM80300', 'TCAM')
     OR name ILIKE '%tcam%'
  LIMIT 1;
  
  IF tcam_club_id IS NULL THEN
    RAISE EXCEPTION 'Club TCAM not found. Please create it first.';
  END IF;
  
  RAISE NOTICE 'Found TCAM club: id=%, slug=%', tcam_club_id, tcam_club_slug;
  
  -- 2. Normaliser club_slug pour tous les profils du club TCAM
  -- Mettre à jour les profils qui ont un club_id correspondant
  UPDATE public.profiles
  SET club_slug = tcam_club_slug
  WHERE club_id = tcam_club_id
    AND (club_slug IS NULL OR club_slug != tcam_club_slug);
  
  RAISE NOTICE 'Updated club_slug for % profiles with club_id=%', SQL%ROWCOUNT, tcam_club_id;
  
  -- 3. Renseigner club_id pour les profils qui ont seulement club_slug
  UPDATE public.profiles
  SET club_id = tcam_club_id
  WHERE (club_slug = tcam_club_slug OR club_slug IN ('tcam80300', 'tcam', 'TCAM80300', 'TCAM'))
    AND (club_id IS NULL OR club_id != tcam_club_id);
  
  RAISE NOTICE 'Updated club_id for % profiles with club_slug matching TCAM', SQL%ROWCOUNT;
  
  -- 4. Vérifier les résultats
  DECLARE
    total_profiles INTEGER;
    profiles_with_both INTEGER;
    profiles_with_id_only INTEGER;
    profiles_with_slug_only INTEGER;
  BEGIN
    SELECT COUNT(*) INTO total_profiles
    FROM public.profiles
    WHERE club_id = tcam_club_id OR club_slug = tcam_club_slug;
    
    SELECT COUNT(*) INTO profiles_with_both
    FROM public.profiles
    WHERE club_id = tcam_club_id AND club_slug = tcam_club_slug;
    
    SELECT COUNT(*) INTO profiles_with_id_only
    FROM public.profiles
    WHERE club_id = tcam_club_id AND (club_slug IS NULL OR club_slug != tcam_club_slug);
    
    SELECT COUNT(*) INTO profiles_with_slug_only
    FROM public.profiles
    WHERE club_slug = tcam_club_slug AND (club_id IS NULL OR club_id != tcam_club_id);
    
    RAISE NOTICE '=== TCAM Club Data Summary ===';
    RAISE NOTICE 'Total profiles in TCAM: %', total_profiles;
    RAISE NOTICE 'Profiles with both club_id and club_slug: %', profiles_with_both;
    RAISE NOTICE 'Profiles with club_id only: %', profiles_with_id_only;
    RAISE NOTICE 'Profiles with club_slug only: %', profiles_with_slug_only;
    
    IF profiles_with_slug_only > 0 OR profiles_with_id_only > 0 THEN
      RAISE WARNING 'Some profiles still need normalization. Run this script again.';
    ELSE
      RAISE NOTICE 'All TCAM profiles are normalized!';
    END IF;
  END;
END $$;


