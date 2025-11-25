-- ============================================
-- MISE À JOUR DU CLUB PADEL ROUEN
-- ============================================
-- Ce script met à jour le nom du club et le code d'invitation
-- pour le club "padel rouen"
-- Exécutez ce script dans Supabase SQL Editor

-- Fonction pour générer le code d'invitation (identique à celle dans register/route.ts)
CREATE OR REPLACE FUNCTION build_invitation_code(name TEXT, postal_code TEXT)
RETURNS TEXT AS $$
DECLARE
  upper_name TEXT;
BEGIN
  -- Normaliser le nom : enlever les accents, mettre en majuscules, garder uniquement lettres et chiffres
  upper_name := UPPER(
    REGEXP_REPLACE(
      TRANSLATE(name, 'àáâãäåèéêëìíîïòóôõöùúûüýÿ', 'aaaaaaeeeeiiiiooooouuuuyy'),
      '[^A-Z0-9]+',
      '',
      'g'
    )
  );
  
  -- Retourner nom + code postal
  RETURN upper_name || postal_code;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Mettre à jour le club "padel rouen"
-- Remplacez les valeurs ci-dessous selon vos besoins :
-- - Le nom exact du club dans la base (peut être "Padel Rouen", "padel rouen", etc.)
-- - Le nouveau nom souhaité
-- - Le code postal (5 chiffres)

DO $$
DECLARE
  club_record RECORD;
  new_name TEXT := 'Padel Rouen';  -- Nouveau nom du club
  postal_code TEXT := '76000';     -- Code postal (5 chiffres)
  new_invite_code TEXT;
  club_slug_pattern TEXT;
BEGIN
  -- Chercher le club par nom (insensible à la casse)
  SELECT id, name, slug, code_invitation, postal_code as current_postal
  INTO club_record
  FROM clubs
  WHERE LOWER(name) LIKE '%padel%rouen%' OR LOWER(slug) LIKE '%rouen%'
  LIMIT 1;

  IF club_record.id IS NULL THEN
    RAISE NOTICE 'Aucun club trouvé avec "padel rouen" dans le nom ou le slug';
    RETURN;
  END IF;

  RAISE NOTICE 'Club trouvé : % (ID: %, Slug: %, Code actuel: %)', 
    club_record.name, club_record.id, club_record.slug, club_record.code_invitation;

  -- Générer le nouveau code d'invitation
  new_invite_code := build_invitation_code(new_name, postal_code);
  
  RAISE NOTICE 'Nouveau code d''invitation généré : %', new_invite_code;

  -- Vérifier si le code d'invitation existe déjà pour un autre club
  IF EXISTS (
    SELECT 1 FROM clubs 
    WHERE code_invitation = new_invite_code 
    AND id != club_record.id
  ) THEN
    RAISE EXCEPTION 'Le code d''invitation % existe déjà pour un autre club', new_invite_code;
  END IF;

  -- Mettre à jour le club
  UPDATE clubs
  SET 
    name = new_name,
    code_invitation = new_invite_code,
    postal_code = postal_code,
    updated_at = NOW()
  WHERE id = club_record.id;

  RAISE NOTICE '✅ Club mis à jour avec succès :';
  RAISE NOTICE '   - Nom : %', new_name;
  RAISE NOTICE '   - Code d''invitation : %', new_invite_code;
  RAISE NOTICE '   - Code postal : %', postal_code;

END $$;

-- Afficher le résultat
SELECT 
  id,
  name,
  slug,
  code_invitation,
  postal_code,
  updated_at
FROM clubs
WHERE LOWER(name) LIKE '%padel%rouen%' OR LOWER(slug) LIKE '%rouen%'
ORDER BY updated_at DESC
LIMIT 1;

