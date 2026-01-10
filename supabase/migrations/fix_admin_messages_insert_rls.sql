-- =============================================
-- CORRECTION RLS : Admin peut insérer des messages
-- =============================================

-- Supprimer l'ancienne politique qui ne permet pas l'INSERT
DROP POLICY IF EXISTS "Admin voit tous les messages" ON messages;

-- Créer une politique SELECT séparée pour les admins
CREATE POLICY "Admin voit tous les messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Créer une politique INSERT spécifique pour les admins
CREATE POLICY "Admin envoie des messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  is_admin = true AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Créer une politique UPDATE pour les admins (au cas où)
CREATE POLICY "Admin met à jour les messages"
ON messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Commentaire
COMMENT ON POLICY "Admin envoie des messages" ON messages IS 
  'Permet aux admins d''insérer des messages dans n''importe quelle conversation';
