-- =============================================
-- AJOUT POLICY DELETE POUR ADMINS SUR CONVERSATIONS
-- =============================================
-- Permet aux admins de supprimer des conversations
-- Les messages associés seront automatiquement supprimés grâce à ON DELETE CASCADE

-- Supprimer l'ancienne policy si elle existe
DROP POLICY IF EXISTS "Admin supprime les conversations" ON conversations;

-- Créer la policy DELETE pour les admins
CREATE POLICY "Admin supprime les conversations"
ON conversations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Commentaire
COMMENT ON POLICY "Admin supprime les conversations" ON conversations IS 
  'Permet aux admins de supprimer n''importe quelle conversation';
