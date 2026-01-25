-- ============================================
-- FIX: Ajouter les types de notifications manquants pour la validation de match
-- et corriger les données existantes avant d'appliquer la contrainte
-- ============================================

-- 1. Supprimer l'ancienne contrainte pour pouvoir modifier les données
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Convertir les types invalides en 'system' (ou supprimer si préféré)
-- Cela évite l'erreur "check constraint violated"
UPDATE public.notifications 
SET type = 'system' 
WHERE type NOT IN (
    'badge_unlocked', 
    'level_up', 
    'top3', 
    'top3_ranking', 
    'referral', 
    'challenge', 
    'badge',
    'chat', 
    'system',
    'partnership_request', 
    'partnership_accepted', 
    'match_proposal', 
    'match_accepted', 
    'match_declined',
    'match_validated',
    'match_refusal_warning'
);

-- 3. Ajouter la nouvelle contrainte avec tous les types requis
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'badge_unlocked', 
    'level_up', 
    'top3', 
    'top3_ranking', 
    'referral', 
    'challenge', 
    'badge',
    'chat', 
    'system',
    'partnership_request', 
    'partnership_accepted', 
    'match_proposal', 
    'match_accepted', 
    'match_declined',
    'match_validated',
    'match_refusal_warning'
  ));

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Données nettoyées et contrainte notifications_type_check mise à jour avec succès';
END $$;
