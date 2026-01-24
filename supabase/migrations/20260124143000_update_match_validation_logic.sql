-- Migration pour supporter la confirmation par les invités et mettre à jour la logique de validation

-- 1. Modifier la table match_confirmations pour supporter les invités
ALTER TABLE public.match_confirmations
ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.match_confirmations
ADD COLUMN IF NOT EXISTS guest_player_id UUID REFERENCES public.guest_players(id) ON DELETE CASCADE;

-- Ajouter une contrainte pour s'assurer qu'on a soit user_id soit guest_player_id
ALTER TABLE public.match_confirmations
ADD CONSTRAINT match_confirmations_participant_check 
CHECK (
  (user_id IS NOT NULL AND guest_player_id IS NULL) OR 
  (user_id IS NULL AND guest_player_id IS NOT NULL)
);

-- Mettre à jour l'index unique pour inclure guest_player_id (en gérant les NULLs)
-- On supprime l'ancienne contrainte unique
ALTER TABLE public.match_confirmations DROP CONSTRAINT IF EXISTS match_confirmations_match_id_user_id_key;

-- On crée un index unique partiel pour les users
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_confirmations_unique_user 
ON public.match_confirmations(match_id, user_id) 
WHERE user_id IS NOT NULL;

-- On crée un index unique partiel pour les guests
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_confirmations_unique_guest 
ON public.match_confirmations(match_id, guest_player_id) 
WHERE guest_player_id IS NOT NULL;


-- 2. Mettre à jour la fonction de validation
CREATE OR REPLACE FUNCTION check_match_confirmation_status()
RETURNS TRIGGER AS $$
DECLARE
  confirmation_count INTEGER;
  rejection_count INTEGER;
  rejection_threshold CONSTANT INTEGER := 2; -- Il faut 2 refus pour rejeter le match
  validation_threshold CONSTANT INTEGER := 3; -- Il faut 3 confirmations pour valider le match
  match_creator_id UUID;
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
    -- Rejeter le match
    UPDATE public.matches
    SET status = 'rejected'
    WHERE id = NEW.match_id;
    
    -- Optionnel : Notifier que le match est annulé ?
    
  ELSIF rejection_count = 1 AND NEW.confirmed = false THEN
    -- Premier refus : Notifier les autres joueurs (users uniquement)
    -- Message : "Un joueur a refusé un match. Si un joueur de plus refuse le match, alors le match ne sera pas validé"
    
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
      -- On notifie tout le monde, même celui qui a refusé ? Non, peut-être pas.
      -- Mais c'est plus simple de notifier tous les users participants.
  END IF;

  -- LOGIQUE DE VALIDATION
  IF confirmation_count >= validation_threshold THEN
    -- Valider le match
    UPDATE public.matches
    SET status = 'confirmed',
        confirmed_at = NOW()
    WHERE id = NEW.match_id;
    
    -- Notifier tous les joueurs (users uniquement)
    -- Message : "Un match a été validé ! Allez voir vos statistiques et votre classement."
    
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
      
    -- Déclencher le calcul des points Elo ou autre logique post-validation si nécessaire
    -- (Généralement géré par un autre trigger sur matches 'confirmed')
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
