-- =============================================
-- FIX RLS POLICIES POUR CLUB_CONVERSATIONS
-- =============================================
-- Correction des politiques RLS pour permettre la création de conversations par les clubs
-- Support des admins via club_admins ET profiles.club_id

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Clubs créent leur conversation" ON club_conversations;
DROP POLICY IF EXISTS "Clubs voient leur conversation" ON club_conversations;
DROP POLICY IF EXISTS "Clubs mettent à jour leur conversation" ON club_conversations;

-- CLUBS : Voir leur conversation (via profiles.club_id OU club_admins)
CREATE POLICY "Clubs voient leur conversation"
ON club_conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.club_id = club_conversations.club_id
  )
  OR EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.user_id = auth.uid()
    AND club_admins.club_id = club_conversations.club_id
  )
);

-- CLUBS : Créer leur conversation (via profiles.club_id OU club_admins)
-- Dans WITH CHECK, on utilise directement 'club_id' sans préfixe de table
CREATE POLICY "Clubs créent leur conversation"
ON club_conversations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.club_id = club_id
  )
  OR EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.user_id = auth.uid()
    AND club_admins.club_id = club_id
  )
);

-- CLUBS : Mettre à jour leur conversation
CREATE POLICY "Clubs mettent à jour leur conversation"
ON club_conversations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.club_id = club_conversations.club_id
  )
  OR EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.user_id = auth.uid()
    AND club_admins.club_id = club_conversations.club_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.club_id = club_conversations.club_id
  )
  OR EXISTS (
    SELECT 1 FROM club_admins
    WHERE club_admins.user_id = auth.uid()
    AND club_admins.club_id = club_conversations.club_id
  )
);

-- Mettre à jour les politiques pour les messages aussi
DROP POLICY IF EXISTS "Clubs voient leurs messages" ON club_messages;
DROP POLICY IF EXISTS "Clubs envoient des messages" ON club_messages;

-- CLUBS : Voir leurs messages
CREATE POLICY "Clubs voient leurs messages"
ON club_messages FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM club_conversations 
    WHERE club_id IN (
      SELECT club_id FROM profiles WHERE id = auth.uid()
    )
    OR club_id IN (
      SELECT club_id FROM club_admins WHERE user_id = auth.uid()
    )
  )
);

-- CLUBS : Envoyer des messages dans leur conversation
CREATE POLICY "Clubs envoient des messages"
ON club_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  is_admin = false AND
  conversation_id IN (
    SELECT id FROM club_conversations 
    WHERE club_id IN (
      SELECT club_id FROM profiles WHERE id = auth.uid()
    )
    OR club_id IN (
      SELECT club_id FROM club_admins WHERE user_id = auth.uid()
    )
  )
);

-- Commentaires
COMMENT ON POLICY "Clubs créent leur conversation" ON club_conversations IS 
  'Permet aux clubs de créer leur conversation (via profiles.club_id ou club_admins)';
