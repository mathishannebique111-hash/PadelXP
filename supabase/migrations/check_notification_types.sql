-- =============================================
-- DIAGNOSTIC : Voir quels types de notifications existent
-- =============================================
-- Exécutez ce script pour voir quels types sont dans votre base de données

SELECT DISTINCT type, COUNT(*) as count 
FROM notifications 
GROUP BY type 
ORDER BY type;

-- Si vous voyez des types qui ne sont pas dans la liste ci-dessous, 
-- il faut les supprimer ou les corriger avant d'exécuter create_partnerships_and_match_proposals.sql

-- Types autorisés complets:
-- 'badge_unlocked', 'level_up', 'top3', 'top3_ranking', 'referral', 'challenge', 'badge',
-- 'chat', 'system',
-- 'partnership_request', 'partnership_accepted', 'match_proposal', 'match_accepted', 'match_declined'
