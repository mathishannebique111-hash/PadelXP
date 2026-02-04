-- ============================================
-- Ajouter les types de notifications pour les réservations
-- ============================================

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Convertir les types invalides en 'system'
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
    'partnership_declined',
    'match_proposal', 
    'match_accepted', 
    'match_declined',
    'match_validated',
    'match_refusal_warning',
    'team_challenge_received', 
    'team_challenge_accepted_step', 
    'team_challenge_accepted_final', 
    'team_challenge_refused', 
    'team_challenge_expired', 
    'team_challenge_reminder',
    'match_invitation_received', 
    'match_invitation_accepted', 
    'match_invitation_refused', 
    'match_invitation_expired',
    -- Nouveaux types pour les réservations
    'reservation_created',
    'reservation_confirmed',
    'reservation_cancelled',
    'reservation_expired',
    'reservation_payment_reminder'
);

-- 3. Recréer la contrainte avec les nouveaux types
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
    'partnership_declined',
    'match_proposal', 
    'match_accepted', 
    'match_declined',
    'match_validated',
    'match_refusal_warning',
    'team_challenge_received', 
    'team_challenge_accepted_step', 
    'team_challenge_accepted_final', 
    'team_challenge_refused', 
    'team_challenge_expired', 
    'team_challenge_reminder',
    'match_invitation_received', 
    'match_invitation_accepted', 
    'match_invitation_refused', 
    'match_invitation_expired',
    -- Nouveaux types pour les réservations
    'reservation_created',
    'reservation_confirmed',
    'reservation_cancelled',
    'reservation_expired',
    'reservation_payment_reminder'
  ));

-- ============================================
-- TRIGGER : Notification aux participants lors de la création
-- ============================================
CREATE OR REPLACE FUNCTION notify_reservation_participants()
RETURNS TRIGGER AS $$
DECLARE
  organizer_name TEXT;
  court_name TEXT;
  club_name TEXT;
  start_time_formatted TEXT;
BEGIN
  -- Récupérer les infos de l'organisateur
  SELECT first_name || ' ' || last_name INTO organizer_name
  FROM profiles 
  WHERE id = (SELECT created_by FROM reservations WHERE id = NEW.reservation_id);

  -- Récupérer les infos du terrain
  SELECT c.name, cl.name INTO court_name, club_name
  FROM reservations r
  JOIN courts c ON c.id = r.court_id
  JOIN clubs cl ON cl.id = c.club_id
  WHERE r.id = NEW.reservation_id;

  -- Formater l'heure
  SELECT to_char((SELECT start_time FROM reservations WHERE id = NEW.reservation_id), 'DD/MM à HH24:MI')
  INTO start_time_formatted;

  -- Ne notifier que les non-organisateurs
  IF NOT NEW.is_organizer THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'reservation_created',
      'Nouvelle réservation',
      organizer_name || ' vous a ajouté à une réservation au ' || club_name || ' le ' || start_time_formatted,
      jsonb_build_object(
        'reservation_id', NEW.reservation_id,
        'court_name', court_name,
        'club_name', club_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_reservation_participants ON reservation_participants;
CREATE TRIGGER trigger_notify_reservation_participants
AFTER INSERT ON reservation_participants
FOR EACH ROW
EXECUTE FUNCTION notify_reservation_participants();

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Types de notifications et triggers pour les réservations ajoutés avec succès';
END $$;
