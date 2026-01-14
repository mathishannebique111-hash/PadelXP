-- =============================================
-- SYSTÈME DE NOTIFICATIONS PUSH DÉTAILLÉ
-- =============================================

-- 1. Mise à jour de la contrainte CHECK pour inclure tous les types nécessaires
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'badge_unlocked', 'level_up', 'top3', 'top3_ranking', 'referral', 'challenge', 'badge',
    'chat', 'system',
    'partnership_request', 'partnership_accepted', 'partnership_declined',
    'team_challenge_received', 'team_challenge_accepted_step', 'team_challenge_accepted_final', 'team_challenge_refused', 'team_challenge_expired', 'team_challenge_reminder',
    'match_invitation_received', 'match_invitation_accepted', 'match_invitation_refused', 'match_invitation_expired'
  ));

-- 2. Triggers pour MATCH_INVITATIONS (Invitations de paire ponctuelles)
-- =============================================

CREATE OR REPLACE FUNCTION public.notify_match_invitation_request()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, display_name, 'Un joueur') 
  INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.receiver_id,
    'match_invitation_received',
    'Invitation à jouer',
    sender_name || ' vous invite à jouer une partie de padel !',
    jsonb_build_object('invitation_id', NEW.id, 'sender_id', NEW.sender_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_match_invitation_request ON public.match_invitations;
CREATE TRIGGER trigger_notify_match_invitation_request
AFTER INSERT ON public.match_invitations
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.notify_match_invitation_request();

CREATE OR REPLACE FUNCTION public.notify_match_invitation_update()
RETURNS TRIGGER AS $$
DECLARE
  receiver_name TEXT;
  sender_name TEXT;
BEGIN
  -- 1. CAS ACCEPTATION
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT COALESCE(first_name || ' ' || last_name, display_name, 'Un joueur') 
    INTO receiver_name FROM public.profiles WHERE id = NEW.receiver_id;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.sender_id,
      'match_invitation_accepted',
      'Invitation acceptée',
      receiver_name || ' a accepté votre invitation à jouer !',
      jsonb_build_object('invitation_id', NEW.id, 'receiver_id', NEW.receiver_id)
    );

  -- 2. CAS REFUS
  ELSIF NEW.status = 'refused' AND OLD.status = 'pending' THEN
    SELECT COALESCE(first_name || ' ' || last_name, display_name, 'Un joueur') 
    INTO receiver_name FROM public.profiles WHERE id = NEW.receiver_id;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.sender_id,
      'match_invitation_refused',
      'Invitation déclinée',
      receiver_name || ' a décliné votre invitation à jouer.',
      jsonb_build_object('invitation_id', NEW.id, 'receiver_id', NEW.receiver_id)
    );

  -- 3. CAS EXPIRATION
  ELSIF NEW.status = 'expired' AND OLD.status = 'pending' THEN
    SELECT COALESCE(first_name || ' ' || last_name, display_name, 'Un joueur') 
    INTO receiver_name FROM public.profiles WHERE id = NEW.receiver_id;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.sender_id,
      'match_invitation_expired',
      'Invitation expirée',
      'Votre invitation à jouer avec ' || receiver_name || ' a expiré.',
      jsonb_build_object('invitation_id', NEW.id, 'receiver_id', NEW.receiver_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_match_invitation_update ON public.match_invitations;
CREATE TRIGGER trigger_notify_match_invitation_update
AFTER UPDATE ON public.match_invitations
FOR EACH ROW
EXECUTE FUNCTION public.notify_match_invitation_update();


-- 3. Triggers pour TEAM_CHALLENGES (Défis de paires)
-- =============================================

CREATE OR REPLACE FUNCTION public.notify_team_challenge_request()
RETURNS TRIGGER AS $$
DECLARE
  challenger1_name TEXT;
  challenger2_name TEXT;
BEGIN
  SELECT first_name INTO challenger1_name FROM public.profiles WHERE id = NEW.challenger_player_1_id;
  SELECT first_name INTO challenger2_name FROM public.profiles WHERE id = NEW.challenger_player_2_id;

  -- Notifier Défendeur 1
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.defender_player_1_id,
    'team_challenge_received',
    'Nouveau défi !',
    challenger1_name || ' et ' || challenger2_name || ' vous ont défié !',
    jsonb_build_object('challenge_id', NEW.id)
  );

  -- Notifier Défendeur 2
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.defender_player_2_id,
    'team_challenge_received',
    'Nouveau défi !',
    challenger1_name || ' et ' || challenger2_name || ' vous ont défié !',
    jsonb_build_object('challenge_id', NEW.id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_team_challenge_request ON public.team_challenges;
CREATE TRIGGER trigger_notify_team_challenge_request
AFTER INSERT ON public.team_challenges
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_challenge_request();

CREATE OR REPLACE FUNCTION public.notify_team_challenge_update()
RETURNS TRIGGER AS $$
DECLARE
  defender_name TEXT;
  is_final BOOLEAN;
  challenger_1_id UUID;
  challenger_2_id UUID;
  defender_team_name TEXT;
BEGIN
  challenger_1_id := NEW.challenger_player_1_id;
  challenger_2_id := NEW.challenger_player_2_id;

  -- 1. CAS ACCEPTATION (Même logique que précédemment mais centralisée)
  IF (NEW.defender_1_status = 'accepted' AND OLD.defender_1_status = 'pending') OR 
     (NEW.defender_2_status = 'accepted' AND OLD.defender_2_status = 'pending') THEN
    
    IF (NEW.defender_1_status = 'accepted' AND OLD.defender_1_status = 'pending') THEN
      SELECT first_name INTO defender_name FROM public.profiles WHERE id = NEW.defender_player_1_id;
    ELSE
      SELECT first_name INTO defender_name FROM public.profiles WHERE id = NEW.defender_player_2_id;
    END IF;

    is_final := (NEW.status = 'accepted');

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES 
      (challenger_1_id, 
       CASE WHEN is_final THEN 'team_challenge_accepted_final' ELSE 'team_challenge_accepted_step' END,
       'Défi accepté',
       CASE WHEN is_final THEN defender_name || ' a accepté ! Le match est validé 🎾' ELSE defender_name || ' a accepté votre défi !' END,
       jsonb_build_object('challenge_id', NEW.id, 'is_final', is_final)),
      (challenger_2_id, 
       CASE WHEN is_final THEN 'team_challenge_accepted_final' ELSE 'team_challenge_accepted_step' END,
       'Défi accepté',
       CASE WHEN is_final THEN defender_name || ' a accepté ! Le match est validé 🎾' ELSE defender_name || ' a accepté votre défi !' END,
       jsonb_build_object('challenge_id', NEW.id, 'is_final', is_final));

  -- 2. CAS REFUS
  ELSIF NEW.status = 'refused' AND OLD.status = 'pending' THEN
    -- On cherche qui a refusé (si c'est dû à un joueur et non à l'expiration)
    IF NEW.defender_1_status = 'refused' AND OLD.defender_1_status = 'pending' THEN
      SELECT first_name INTO defender_name FROM public.profiles WHERE id = NEW.defender_player_1_id;
    ELSIF NEW.defender_2_status = 'refused' AND OLD.defender_2_status = 'pending' THEN
      SELECT first_name INTO defender_name FROM public.profiles WHERE id = NEW.defender_player_2_id;
    END IF;

    IF defender_name IS NOT NULL THEN
      -- Refus manuel par un joueur
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES 
        (challenger_1_id, 'team_challenge_refused', 'Défi décliné', defender_name || ' a décliné le défi. Le défi est annulé.', jsonb_build_object('challenge_id', NEW.id)),
        (challenger_2_id, 'team_challenge_refused', 'Défi décliné', defender_name || ' a décliné le défi. Le défi est annulé.', jsonb_build_object('challenge_id', NEW.id));
    ELSE
      -- Probablement une expiration automatique
      SELECT first_name INTO defender_name FROM public.profiles WHERE id = NEW.defender_player_1_id;
      SELECT first_name || ' & ' || (SELECT first_name FROM public.profiles WHERE id = NEW.defender_player_2_id) INTO defender_team_name;
      
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES 
        (challenger_1_id, 'team_challenge_expired', 'Défi expiré', 'Le défi envoyé à ' || defender_team_name || ' a expiré.', jsonb_build_object('challenge_id', NEW.id)),
        (challenger_2_id, 'team_challenge_expired', 'Défi expiré', 'Le défi envoyé à ' || defender_team_name || ' a expiré.', jsonb_build_object('challenge_id', NEW.id));
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_team_challenge_update ON public.team_challenges;
CREATE TRIGGER trigger_notify_team_challenge_update
AFTER UPDATE ON public.team_challenges
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_challenge_update();


-- 4. Triggers pour PARTNERSHIPS (Partenariats habituels)
-- =============================================

CREATE OR REPLACE FUNCTION public.notify_partnership_request()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, display_name, 'Un joueur') 
  INTO sender_name FROM public.profiles WHERE id = NEW.player_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.partner_id,
    'partnership_request',
    'Demande de partenariat',
    sender_name || ' souhaite être votre partenaire habituel !',
    jsonb_build_object('partnership_id', NEW.id, 'player_id', NEW.player_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_partnership_request ON public.player_partnerships;
CREATE TRIGGER trigger_notify_partnership_request
AFTER INSERT ON public.player_partnerships
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.notify_partnership_request();

CREATE OR REPLACE FUNCTION public.notify_partnership_update()
RETURNS TRIGGER AS $$
DECLARE
  partner_name TEXT;
BEGIN
  -- 1. CAS ACCEPTATION
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT COALESCE(first_name || ' ' || last_name, display_name, 'Un joueur') 
    INTO partner_name FROM public.profiles WHERE id = NEW.partner_id;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.player_id,
      'partnership_accepted',
      'Partenariat accepté',
      partner_name || ' a accepté votre demande de partenariat !',
      jsonb_build_object('partnership_id', NEW.id, 'partner_id', NEW.partner_id)
    );

  -- 2. CAS REFUS
  ELSIF NEW.status = 'declined' AND OLD.status = 'pending' THEN
    SELECT COALESCE(first_name || ' ' || last_name, display_name, 'Un joueur') 
    INTO partner_name FROM public.profiles WHERE id = NEW.partner_id;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.player_id,
      'partnership_declined',
      'Partenariat décliné',
      partner_name || ' a décliné votre demande de partenariat.',
      jsonb_build_object('partnership_id', NEW.id, 'partner_id', NEW.partner_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_partnership_update ON public.player_partnerships;
CREATE TRIGGER trigger_notify_partnership_update
AFTER UPDATE ON public.player_partnerships
FOR EACH ROW
EXECUTE FUNCTION public.notify_partnership_update();

-- 5. Fonction pour les rappels d'expiration (12h avant)
-- =============================================
-- Cette fonction doit être appelée périodiquement (ex: toutes les heures via pg_cron)

CREATE OR REPLACE FUNCTION public.check_and_notify_expiring_challenges()
RETURNS void AS $$
DECLARE
  challenge_row RECORD;
  challenger_team_name TEXT;
BEGIN
  -- Trouver les défis en suspend qui expirent dans environ 12h (entre 11h et 13h)
  -- Et pour lesquels on n'a pas encore envoyé de rappel
  FOR challenge_row IN 
    SELECT tc.* 
    FROM public.team_challenges tc
    WHERE tc.status = 'pending'
      AND tc.expires_at > NOW() + INTERVAL '11 hours'
      AND tc.expires_at < NOW() + INTERVAL '13 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n 
        WHERE n.type = 'team_challenge_reminder' 
          AND (n.data->>'challenge_id')::uuid = tc.id
      )
  LOOP
    -- Récupérer le nom de l'équipe challenger
    SELECT first_name || ' & ' || (SELECT first_name FROM public.profiles WHERE id = challenge_row.challenger_player_2_id)
    INTO challenger_team_name
    FROM public.profiles WHERE id = challenge_row.challenger_player_1_id;

    -- Notifier Défendeur 1
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      challenge_row.defender_player_1_id,
      'team_challenge_reminder',
      '⚠️ Défi expire bientôt',
      'Le défi de ' || challenger_team_name || ' expire dans 12h. Répondez vite !',
      jsonb_build_object('challenge_id', challenge_row.id)
    );

    -- Notifier Défendeur 2
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      challenge_row.defender_player_2_id,
      'team_challenge_reminder',
      '⚠️ Défi expire bientôt',
      'Le défi de ' || challenger_team_name || ' expire dans 12h. Répondez vite !',
      jsonb_build_object('challenge_id', challenge_row.id)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
