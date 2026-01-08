-- ============================================
-- AMÉLIORATION DE LA TABLE NOTIFICATIONS
-- ============================================
-- Ce script améliore la table notifications pour le système premium
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Vérifier et améliorer la structure de la table
-- ============================================
DO $$ 
BEGIN
  -- Ajouter la colonne title si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN title TEXT;
  END IF;

  -- Ajouter la colonne message si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'message'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN message TEXT;
  END IF;

  -- Ajouter la colonne is_read si elle n'existe pas (pour compatibilité avec le nouveau système)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
    
    -- Synchroniser is_read avec read pour les données existantes
    UPDATE public.notifications SET is_read = COALESCE(read, false) WHERE is_read IS NULL;
  END IF;

  -- S'assurer que type accepte les nouveaux types
  -- Supprimer la contrainte CHECK existante si elle existe
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  
  -- Recréer la contrainte avec les nouveaux types
  ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('badge', 'badge_unlocked', 'level_up', 'top3', 'top3_ranking', 'referral', 'challenge', 'chat', 'system'));
END $$;

-- 2. Créer les index pour performance
-- ============================================
-- Index pour les notifications non lues (utilise is_read si disponible, sinon read)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications(user_id, created_at DESC)
  WHERE (is_read = false OR (is_read IS NULL AND read = false));

-- Index alternatif pour compatibilité avec read
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_read 
  ON public.notifications(user_id, created_at DESC)
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
  ON public.notifications(created_at DESC);

-- 3. Trigger pour synchroniser read et is_read automatiquement
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_notification_read_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Synchroniser is_read avec read si read est modifié
  IF TG_OP = 'UPDATE' THEN
    IF NEW.read IS DISTINCT FROM OLD.read THEN
      NEW.is_read := NEW.read;
    ELSIF NEW.is_read IS DISTINCT FROM OLD.is_read THEN
      NEW.read := NEW.is_read;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- À l'insertion, synchroniser les deux colonnes
    IF NEW.is_read IS NULL AND NEW.read IS NOT NULL THEN
      NEW.is_read := NEW.read;
    ELSIF NEW.read IS NULL AND NEW.is_read IS NOT NULL THEN
      NEW.read := NEW.is_read;
    ELSIF NEW.is_read IS NULL AND NEW.read IS NULL THEN
      NEW.is_read := false;
      NEW.read := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_sync_notification_read_status ON public.notifications;
CREATE TRIGGER trigger_sync_notification_read_status
  BEFORE INSERT OR UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_notification_read_status();

-- 4. Fonction pour auto-suppression après 72h (optionnel, peut être géré côté frontend)
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '72 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Commentaires pour documentation
-- ============================================
COMMENT ON TABLE public.notifications IS 'Table des notifications utilisateur avec auto-suppression 72h';
COMMENT ON COLUMN public.notifications.type IS 'Type: badge, badge_unlocked, level_up, top3, chat, system';
COMMENT ON COLUMN public.notifications.data IS 'Données JSONB: { badge_id, image_url, chat_user_id, conversation_id, etc. }';
COMMENT ON COLUMN public.notifications.created_at IS 'Date de création, utilisé pour auto-suppression 72h';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Table notifications améliorée avec succès';
  RAISE NOTICE '✅ Index de performance créés';
  RAISE NOTICE '✅ Fonction de nettoyage créée (peut être appelée via pg_cron)';
END $$;
