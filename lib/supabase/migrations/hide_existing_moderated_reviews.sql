-- ============================================
-- MIGRATION: Masquer les avis existants qui doivent être modérés
-- ============================================
-- Ce script met à jour tous les avis existants qui correspondent aux critères de modération
-- (3 étoiles ou moins ET 6 mots ou moins dans le commentaire)
-- et les marque comme is_hidden = true

-- Fonction pour compter les mots dans un texte (approximation SQL)
-- En SQL, on compte les espaces + 1 comme nombre de mots
CREATE OR REPLACE FUNCTION count_words(text_value TEXT)
RETURNS INTEGER AS $$
BEGIN
  IF text_value IS NULL OR TRIM(text_value) = '' THEN
    RETURN 0;
  END IF;
  
  -- Compter les mots en divisant par les espaces
  -- array_length avec ' ' comme séparateur compte les segments
  RETURN array_length(string_to_array(TRIM(text_value), ' '), 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Mettre à jour tous les avis qui doivent être masqués
-- (rating <= 3 ET (commentaire est NULL OU compte de mots <= 6))
UPDATE public.reviews
SET is_hidden = TRUE
WHERE rating <= 3
  AND (comment IS NULL OR count_words(comment) <= 6)
  AND (is_hidden IS NULL OR is_hidden = FALSE);

-- Vérifier combien d'avis ont été masqués
SELECT 
  COUNT(*) as total_hidden_reviews,
  COUNT(*) FILTER (WHERE rating <= 3 AND (comment IS NULL OR count_words(comment) <= 6)) as should_be_hidden,
  COUNT(*) FILTER (WHERE is_hidden = TRUE) as actually_hidden
FROM public.reviews;

-- Afficher quelques exemples d'avis masqués
SELECT 
  id,
  rating,
  comment,
  count_words(comment) as word_count,
  is_hidden,
  created_at
FROM public.reviews
WHERE is_hidden = TRUE
ORDER BY created_at DESC
LIMIT 10;

