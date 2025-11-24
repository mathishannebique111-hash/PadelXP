-- Migration : Corriger la contrainte qui empêche la consommation des boosts
-- Date : 2025-11-24
-- Problème : La contrainte check_not_consumed_on_creation empêche de mettre à jour consumed_at
-- Solution : Supprimer cette contrainte car elle n'a pas de sens (elle empêche de consommer les boosts)

-- Supprimer la contrainte problématique
ALTER TABLE public.player_boost_credits
DROP CONSTRAINT IF EXISTS check_not_consumed_on_creation;

-- Vérifier que la contrainte a bien été supprimée
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_not_consumed_on_creation' 
    AND table_name = 'player_boost_credits'
  ) THEN
    RAISE EXCEPTION 'La contrainte check_not_consumed_on_creation existe toujours';
  ELSE
    RAISE NOTICE 'Contrainte check_not_consumed_on_creation supprimée avec succès';
  END IF;
END $$;

