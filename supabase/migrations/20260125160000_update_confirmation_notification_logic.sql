-- ============================================
-- MISE À JOUR LOGIQUE NOTIFICATIONS CONFIRMATION
-- ============================================

-- Mettre à jour la fonction de validation
CREATE OR REPLACE FUNCTION check_match_confirmation_status()
RETURNS TRIGGER AS $$
DECLARE
  confirmation_count INTEGER;
  rejection_count INTEGER;
  rejection_threshold CONSTANT INTEGER := 2; -- Il faut 2 refus pour rejeter le match
  validation_threshold CONSTANT INTEGER := 3; -- Il faut 3 confirmations pour valider le match
  -- Seuil pour la notification intermédiaire (2e confirmation sur 3 requises)
  -- Rappel : le créateur a déjà confirmé implicitement si le système est bien fait, 
  -- mais ici on compte les entrées dans match_confirmations.
  -- Si le créateur a une entrée, alors :
  -- 1 confirmation = créateur seul
  -- 2 confirmations = créateur + 1 joueur
  -- 3 confirmations = validation
  intermediate_threshold CONSTANT INTEGER := 2; 

  match_record RECORD;
BEGIN
  -- Récupérer les infos du match
  SELECT * INTO match_record FROM public.matches WHERE id = NEW.match_id;
  
  -- Si le match est déjà validé ou rejeté, on ne fait rien
  IF match_record.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  -- Compter les confirmations (users + guests)
  SELECT COUNT(*) INTO confirmation_count
  FROM public.match_confirmations
  WHERE match_id = NEW.match_id AND confirmed = true;
  
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

  -- LOGIQUE DE VALIDATION ET NOTIFICATION INTERMEDIAIRE
  
  IF confirmation_count >= validation_threshold THEN
    -- CAS 3 JOUEURS : VALIDATION
    -- Valider le match
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
      
  ELSIF confirmation_count = intermediate_threshold AND NEW.confirmed = true THEN
    -- CAS 2 JOUEURS : NOTIFICATION INTERMEDIAIRE
    -- "Un joueur a confirmé votre match, encore un et il sera validé !"
    
    INSERT INTO public.notifications (user_id, type, title, message, data)
    SELECT 
      mp.user_id,
      'system', -- On utilise 'system' car c'est un message d'info générique
      'Confirmation reçue',
      'Un joueur a confirmé votre match, encore un et il sera validé !',
      jsonb_build_object('match_id', NEW.match_id)
    FROM public.match_participants mp
    WHERE mp.match_id = NEW.match_id 
      AND mp.player_type = 'user'
      AND mp.user_id IS NOT NULL
      -- Optionnel : Ne pas notifier celui qui vient de confirmer ?
      AND mp.user_id != NEW.user_id; 
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Fonction check_match_confirmation_status mise à jour avec notification intermédiaire';
END $$;
