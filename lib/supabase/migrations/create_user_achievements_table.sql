-- ============================================
-- MIGRATION: Création table user_achievements
-- ============================================
-- Cette migration crée une table pour stocker les badges débloqués
-- et les notifications vues, remplaçant le stockage localStorage (vulnérable XSS)
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Créer la table user_achievements
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_type text NOT NULL, -- 'badge', 'tier_notification', 'referral_notification'
  achievement_key text NOT NULL, -- Ex: 'badge_contributor', 'tier_gold', 'referral_notification'
  unlocked_at timestamp DEFAULT now(),
  shown_at timestamp DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb, -- Pour stocker des données supplémentaires
  UNIQUE(user_id, achievement_type, achievement_key)
);

-- 2. Créer un index pour améliorer les performances
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id 
  ON public.user_achievements(user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_type_key 
  ON public.user_achievements(achievement_type, achievement_key);

-- 3. Activer RLS
-- ============================================
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- ============================================
-- Policy SELECT: Les utilisateurs peuvent voir uniquement leurs propres achievements
DROP POLICY IF EXISTS "Users see only their achievements" ON public.user_achievements;
CREATE POLICY "Users see only their achievements"
  ON public.user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy INSERT: Les utilisateurs peuvent créer leurs propres achievements
-- (normalement géré via API avec service_role pour éviter la manipulation)
DROP POLICY IF EXISTS "Users insert their achievements" ON public.user_achievements;
CREATE POLICY "Users insert their achievements"
  ON public.user_achievements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy UPDATE: Les utilisateurs peuvent mettre à jour leurs propres achievements
DROP POLICY IF EXISTS "Users update their achievements" ON public.user_achievements;
CREATE POLICY "Users update their achievements"
  ON public.user_achievements
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: Les achievements sont généralement créés/mis à jour via l'API avec service_role
-- pour garantir l'intégrité des données et éviter la manipulation client-side

-- 5. Fonction utilitaire pour vérifier si un achievement a été vu
-- ============================================
CREATE OR REPLACE FUNCTION public.has_user_seen_achievement(
  p_user_id uuid,
  p_achievement_type text,
  p_achievement_key text
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_achievements
    WHERE user_id = p_user_id
      AND achievement_type = p_achievement_type
      AND achievement_key = p_achievement_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fonction utilitaire pour marquer un achievement comme vu
-- ============================================
CREATE OR REPLACE FUNCTION public.mark_achievement_seen(
  p_user_id uuid,
  p_achievement_type text,
  p_achievement_key text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.user_achievements (
    user_id,
    achievement_type,
    achievement_key,
    metadata
  ) VALUES (
    p_user_id,
    p_achievement_type,
    p_achievement_key,
    p_metadata
  )
  ON CONFLICT (user_id, achievement_type, achievement_key)
  DO UPDATE SET
    shown_at = now(),
    metadata = EXCLUDED.metadata
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Commentaires pour documentation
-- ============================================
COMMENT ON TABLE public.user_achievements IS 'Stocke les badges débloqués et notifications vues par les utilisateurs (remplace localStorage pour sécurité)';
COMMENT ON COLUMN public.user_achievements.achievement_type IS 'Type: badge, tier_notification, referral_notification';
COMMENT ON COLUMN public.user_achievements.achievement_key IS 'Clé unique identifiant l''achievement (ex: badge_contributor, tier_gold)';

