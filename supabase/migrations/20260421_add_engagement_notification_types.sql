-- ============================================
-- Ajouter les types de notifications pour l'engagement automatique
-- Types: match_points_earned, win_streak, partner_match_played,
--        challenge_new, challenge_expiring, challenge_progress,
--        inactivity_reminder, weekly_recap
-- ============================================

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Convertir les types invalides en 'system'
UPDATE public.notifications
SET type = 'system'
WHERE type NOT IN (
    'badge_unlocked', 'level_up', 'top3', 'top3_ranking',
    'referral', 'challenge', 'badge', 'chat', 'system',
    'partnership_request', 'partnership_accepted', 'partnership_declined',
    'match_proposal', 'match_accepted', 'match_declined',
    'match_validated', 'match_refusal_warning',
    'team_challenge_received', 'team_challenge_accepted_step',
    'team_challenge_accepted_final', 'team_challenge_refused',
    'team_challenge_expired', 'team_challenge_reminder',
    'match_invitation_received', 'match_invitation_accepted',
    'match_invitation_refused', 'match_invitation_expired',
    'reservation_created', 'reservation_confirmed',
    'reservation_cancelled', 'reservation_expired',
    'reservation_payment_reminder',
    -- Nouveaux types engagement
    'match_points_earned', 'win_streak', 'partner_match_played',
    'challenge_new', 'challenge_expiring', 'challenge_progress',
    'inactivity_reminder', 'weekly_recap'
);

-- 3. Recréer la contrainte avec tous les types
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    -- Badges & niveaux
    'badge_unlocked', 'level_up', 'top3', 'top3_ranking',
    'referral', 'challenge', 'badge',
    -- Système & chat
    'chat', 'system',
    -- Partenariats
    'partnership_request', 'partnership_accepted', 'partnership_declined',
    -- Matchs (propositions)
    'match_proposal', 'match_accepted', 'match_declined',
    'match_validated', 'match_refusal_warning',
    -- Défis d'équipe
    'team_challenge_received', 'team_challenge_accepted_step',
    'team_challenge_accepted_final', 'team_challenge_refused',
    'team_challenge_expired', 'team_challenge_reminder',
    -- Invitations de match
    'match_invitation_received', 'match_invitation_accepted',
    'match_invitation_refused', 'match_invitation_expired',
    -- Réservations
    'reservation_created', 'reservation_confirmed',
    'reservation_cancelled', 'reservation_expired',
    'reservation_payment_reminder',
    -- Engagement automatique (nouveau)
    'match_points_earned',      -- Points gagnés après confirmation
    'win_streak',               -- Série de victoires (3+)
    'partner_match_played',     -- Ton partenaire a joué
    'challenge_new',            -- Nouveau challenge disponible
    'challenge_expiring',       -- Challenge bientôt expiré
    'challenge_progress',       -- Milestone de progression (50%, 75%)
    'inactivity_reminder',      -- Rappel d'inactivité (7j+)
    'weekly_recap'              -- Résumé hebdomadaire
  ));

DO $$
BEGIN
  RAISE NOTICE '✅ Types de notifications engagement ajoutés avec succès';
END $$;
