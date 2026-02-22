-- ================================================================
-- VALIDATION PAR ÉQUIPE : 1 joueur confirmé par équipe suffit
-- ================================================================
-- Nouvelle logique : au lieu de 3 confirmations sur 4 joueurs,
-- on vérifie qu'au moins 1 joueur de chaque équipe (team 1 et team 2)
-- a confirmé le match.

CREATE OR REPLACE FUNCTION check_match_confirmation_status()
RETURNS TRIGGER AS $$
DECLARE
  team1_confirmed BOOLEAN;
  team2_confirmed BOOLEAN;
  rejection_count INTEGER;
  rejection_threshold CONSTANT INTEGER := 2; -- Il faut 2 refus pour rejeter le match

  match_record RECORD;
BEGIN
  -- Récupérer les infos du match
  SELECT * INTO match_record FROM public.matches WHERE id = NEW.match_id;
  
  -- Si le match est déjà validé ou rejeté, on ne fait rien
  IF match_record.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- Vérifier si au moins 1 joueur de l'équipe 1 a confirmé
  SELECT EXISTS (
    SELECT 1
    FROM public.match_confirmations mc
    JOIN public.match_participants mp ON mp.match_id = mc.match_id
      AND (
        (mc.user_id IS NOT NULL AND mc.user_id = mp.user_id)
        OR (mc.guest_player_id IS NOT NULL AND mc.guest_player_id = mp.guest_player_id)
      )
    WHERE mc.match_id = NEW.match_id
      AND mc.confirmed = true
      AND mp.team = 1
  ) INTO team1_confirmed;

  -- Vérifier si au moins 1 joueur de l'équipe 2 a confirmé
  SELECT EXISTS (
    SELECT 1
    FROM public.match_confirmations mc
    JOIN public.match_participants mp ON mp.match_id = mc.match_id
      AND (
        (mc.user_id IS NOT NULL AND mc.user_id = mp.user_id)
        OR (mc.guest_player_id IS NOT NULL AND mc.guest_player_id = mp.guest_player_id)
      )
    WHERE mc.match_id = NEW.match_id
      AND mc.confirmed = true
      AND mp.team = 2
  ) INTO team2_confirmed;

  -- Compter les refus (users + guests)
  SELECT COUNT(*) INTO rejection_count
  FROM public.match_confirmations
  WHERE match_id = NEW.match_id AND confirmed = false;
  
  -- LOGIQUE DE REJET
  IF rejection_count >= rejection_threshold THEN
    UPDATE public.matches
    SET status = 'rejected'
    WHERE id = NEW.match_id;
    
  ELSIF rejection_count = 1 AND NEW.confirmed = false THEN
    -- Premier refus : Notifier
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT 
      mp.user_id,
      'match_refusal_warning',
      'Refus de match',
      'Un joueur a refusé un match. Si un joueur de plus refuse le match, alors le match ne sera pas validé.',
      jsonb_build_object('match_id', NEW.match_id)
    FROM public.match_participants mp
    WHERE mp.match_id = NEW.match_id 
      AND mp.player_type = 'user'
      AND mp.user_id IS NOT NULL;
  END IF;

  -- LOGIQUE DE VALIDATION
  IF team1_confirmed AND team2_confirmed THEN
    -- Les deux équipes ont un joueur confirmé : VALIDATION
    UPDATE public.matches
    SET status = 'confirmed',
        confirmed_at = NOW()
    WHERE id = NEW.match_id;
    
    -- Notifier : Match validé !
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT 
      mp.user_id,
      'match_validated',
      'Match validé !',
      'Un match a été validé ! Allez voir vos statistiques et votre classement.',
      jsonb_build_object('match_id', NEW.match_id)
    FROM public.match_participants mp
    WHERE mp.match_id = NEW.match_id 
      AND mp.player_type = 'user'
      AND mp.user_id IS NOT NULL;
      
  ELSIF (team1_confirmed OR team2_confirmed) AND NEW.confirmed = true THEN
    -- Une seule équipe a confirmé : notification intermédiaire
    -- "Un joueur a confirmé, il manque un joueur de l'autre équipe"
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT 
      mp.user_id,
      'system',
      'Confirmation reçue',
      'Un joueur a confirmé votre match, il manque un joueur de l''autre équipe pour valider !',
      jsonb_build_object('match_id', NEW.match_id)
    FROM public.match_participants mp
    WHERE mp.match_id = NEW.match_id 
      AND mp.player_type = 'user'
      AND mp.user_id IS NOT NULL
      AND (NEW.user_id IS NULL OR mp.user_id != NEW.user_id); 
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
