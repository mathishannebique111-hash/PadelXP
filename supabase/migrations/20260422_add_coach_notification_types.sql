-- Ajouter les types coach_debrief et coach_message aux notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'badge_unlocked', 'level_up', 'top3', 'top3_ranking',
    'referral', 'challenge', 'badge',
    'chat', 'system',
    'partnership_request', 'partnership_accepted', 'partnership_declined',
    'match_proposal', 'match_accepted', 'match_declined',
    'match_validated', 'match_refusal_warning',
    'match_confirmation',
    'team_challenge_received', 'team_challenge_accepted_step',
    'team_challenge_accepted_final', 'team_challenge_refused',
    'team_challenge_expired', 'team_challenge_reminder',
    'match_invitation_received', 'match_invitation_accepted',
    'match_invitation_refused', 'match_invitation_expired',
    'reservation_created', 'reservation_confirmed',
    'reservation_cancelled', 'reservation_expired',
    'reservation_payment_reminder',
    'match_points_earned', 'win_streak', 'partner_match_played',
    'challenge_new', 'challenge_expiring', 'challenge_progress',
    'inactivity_reminder', 'weekly_recap',
    -- Coach IA
    'coach_debrief', 'coach_message'
  ));
