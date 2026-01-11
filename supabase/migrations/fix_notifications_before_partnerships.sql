-- =============================================
-- CORRECTION : Supprimer les notifications invalides AVANT la migration partnerships
-- =============================================
-- Exécutez ce script AVANT create_partnerships_and_match_proposals.sql

-- Étape 1: Voir quels types existent actuellement (décommenter pour voir)
-- SELECT DISTINCT type, COUNT(*) as count FROM notifications GROUP BY type ORDER BY type;

-- Étape 2: Supprimer TOUTES les notifications (solution rapide si vous n'avez pas de données importantes)
-- OU supprimer uniquement celles avec des types invalides

-- Option A: Supprimer toutes les notifications (si vous n'avez pas besoin de les garder)
-- DELETE FROM notifications;

-- Option B: Supprimer uniquement les notifications avec des types invalides
-- Liste complète de TOUS les types autorisés dans toutes les migrations
DELETE FROM notifications 
WHERE type NOT IN (
  -- Types de create_notifications_system.sql
  'badge_unlocked', 'level_up', 'top3', 'referral', 'challenge', 'badge',
  -- Types de improve_notifications_table.sql
  'top3_ranking', 'chat', 'system',
  -- Types de create_partnerships_and_match_proposals.sql
  'partnership_request', 'partnership_accepted', 'match_proposal', 'match_accepted', 'match_declined'
);

-- Étape 3: Vérifier qu'il n'y a plus de notifications avec des types invalides
-- SELECT DISTINCT type, COUNT(*) as count FROM notifications GROUP BY type ORDER BY type;

-- Maintenant vous pouvez exécuter create_partnerships_and_match_proposals.sql
