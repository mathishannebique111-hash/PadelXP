-- ============================================
-- FIX: Politique RLS pour permettre aux utilisateurs de voir leur propre statut d'admin
-- ============================================
-- Ce script corrige la politique RLS circulaire sur club_admins
-- qui empêchait les utilisateurs de voir leur propre statut d'admin

-- Supprimer l'ancienne policy
DROP POLICY IF EXISTS "Admins can view their club admins" ON club_admins;

-- Créer deux nouvelles policies :
-- 1. Permettre à chaque utilisateur de voir sa propre ligne
CREATE POLICY "Users can view own admin status"
  ON club_admins
  FOR SELECT
  USING (user_id = auth.uid());

-- 2. Permettre aux admins de voir les autres admins de leur club
CREATE POLICY "Admins can view their club admins"
  ON club_admins
  FOR SELECT
  USING (
    club_id IN (
      SELECT club_id FROM club_admins WHERE user_id = auth.uid()
    )
  );













