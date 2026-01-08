-- ============================================
-- SYSTÈME DE NOTIFICATIONS COMPLET
-- ============================================
-- Ce script crée la table notifications et les triggers automatiques
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Créer la table notifications si elle n'existe pas
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('badge_unlocked', 'level_up', 'top3', 'referral', 'challenge', 'badge')),
  title TEXT,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can read their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Policy: Les utilisateurs peuvent lire leurs propres notifications
CREATE POLICY "Users can read their own notifications" ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent mettre à jour leurs propres notifications
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Le service role peut insérer des notifications (pour les triggers)
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- 2. Fonction pour créer une notification de badge
-- ============================================
CREATE OR REPLACE FUNCTION public.create_badge_notification()
RETURNS TRIGGER AS $$
DECLARE
  badge_title TEXT;
  badge_icon TEXT;
  badge_description TEXT;
BEGIN
  -- Récupérer les informations du badge depuis la table user_badges ou depuis les données
  -- On suppose que NEW contient les informations nécessaires
  badge_title := COALESCE(NEW.data->>'badge_name', 'Badge débloqué');
  badge_icon := COALESCE(NEW.data->>'badge_icon', '🏆');
  badge_description := COALESCE(NEW.data->>'badge_description', '');

  -- Créer la notification
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user_id,
    'badge_unlocked',
    'Badge débloqué !',
    badge_title,
    jsonb_build_object(
      'badge_name', badge_title,
      'badge_icon', badge_icon,
      'badge_description', badge_description,
      'timestamp', NOW()
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fonction pour créer une notification de level up
-- ============================================
CREATE OR REPLACE FUNCTION public.create_level_up_notification()
RETURNS TRIGGER AS $$
DECLARE
  tier_name TEXT;
  previous_tier TEXT;
BEGIN
  -- Récupérer les informations du tier
  tier_name := COALESCE(NEW.data->>'tier', NEW.data->>'tier_name', 'Nouveau niveau');
  previous_tier := COALESCE(NEW.data->>'previous_tier', '');

  -- Créer la notification seulement si le tier a changé (pas au premier chargement)
  IF previous_tier IS NOT NULL AND previous_tier != '' THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'level_up',
      'Niveau atteint !',
      format('Félicitations, vous avez atteint le niveau %s.', tier_name),
      jsonb_build_object(
        'tier', tier_name,
        'tier_name', tier_name,
        'previous_tier', previous_tier,
        'timestamp', NOW()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Note: Les triggers seront créés dans une migration séparée ou manuellement
-- car nous devons d'abord vérifier si les tables user_badges et player_levels existent
-- et comprendre leur structure exacte

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Table notifications créée avec succès';
  RAISE NOTICE '✅ Policies RLS configurées';
  RAISE NOTICE '✅ Fonctions de création de notifications créées';
  RAISE NOTICE '⚠️  Les triggers doivent être créés manuellement après vérification des tables source';
END $$;
