-- =============================================
-- CORRECTION : Violation de contrainte notifications_type_check
-- =============================================
-- Ce script corrige les notifications existantes qui ont des types
-- non autorisés avant de mettre à jour la contrainte CHECK

-- Étape 1: Vérifier quels types existent (optionnel - décommenter pour voir)
-- SELECT DISTINCT type, COUNT(*) FROM notifications GROUP BY type;

-- Étape 2: Supprimer les notifications avec des types invalides
-- (ou les mettre à jour si nécessaire)
-- Liste complète des types autorisés incluant ceux de improve_notifications_table.sql
DELETE FROM notifications 
WHERE type NOT IN (
  'badge_unlocked', 'level_up', 'top3', 'top3_ranking', 'referral', 'challenge', 'badge',
  'chat', 'system',
  'partnership_request', 'partnership_accepted', 'match_proposal', 'match_accepted', 'match_declined'
);

-- Étape 3: S'assurer que la contrainte existe avec tous les types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Recréer la contrainte CHECK avec TOUS les types (y compris ceux de improve_notifications_table.sql)
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'badge_unlocked', 'level_up', 'top3', 'top3_ranking', 'referral', 'challenge', 'badge',
    'chat', 'system',
    'partnership_request', 'partnership_accepted', 'match_proposal', 'match_accepted', 'match_declined'
  ));
