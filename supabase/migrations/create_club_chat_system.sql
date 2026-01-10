-- =============================================
-- SYSTÈME DE CHAT CLUB ↔ ADMIN
-- =============================================
-- Système identique au chat joueur-admin mais pour les clubs

-- =============================================
-- TABLE : CLUB_CONVERSATIONS (Une par club)
-- =============================================
CREATE TABLE IF NOT EXISTS club_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  is_read_by_admin BOOLEAN DEFAULT false,
  is_read_by_club BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id)
);

CREATE INDEX IF NOT EXISTS idx_club_conversations_club_id ON club_conversations(club_id);
CREATE INDEX IF NOT EXISTS idx_club_conversations_last_message ON club_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_conversations_unread_admin ON club_conversations(is_read_by_admin) WHERE is_read_by_admin = false;

-- =============================================
-- TABLE : CLUB_MESSAGES (Contenu des échanges)
-- =============================================
CREATE TABLE IF NOT EXISTS club_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES club_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file')),
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_messages_conversation ON club_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_messages_sender ON club_messages(sender_id);

-- =============================================
-- FONCTION : Mettre à jour la conversation automatiquement
-- =============================================
CREATE OR REPLACE FUNCTION update_club_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE club_conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    is_read_by_admin = CASE 
      WHEN NEW.is_admin = false THEN false
      ELSE is_read_by_admin 
    END,
    is_read_by_club = CASE 
      WHEN NEW.is_admin = true THEN false
      ELSE is_read_by_club 
    END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_club_conversation_on_message ON club_messages;
CREATE TRIGGER trigger_update_club_conversation_on_message
AFTER INSERT ON club_messages
FOR EACH ROW
EXECUTE FUNCTION update_club_conversation_on_message();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE club_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_messages ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Clubs voient leur conversation" ON club_conversations;
DROP POLICY IF EXISTS "Clubs créent leur conversation" ON club_conversations;
DROP POLICY IF EXISTS "Clubs mettent à jour leur conversation" ON club_conversations;
DROP POLICY IF EXISTS "Clubs voient leurs messages" ON club_messages;
DROP POLICY IF EXISTS "Clubs envoient des messages" ON club_messages;
DROP POLICY IF EXISTS "Admin voit toutes les conversations clubs" ON club_conversations;
DROP POLICY IF EXISTS "Admin voit tous les messages clubs" ON club_messages;
DROP POLICY IF EXISTS "Admin envoie des messages clubs" ON club_messages;
DROP POLICY IF EXISTS "Admin met à jour les messages clubs" ON club_messages;
DROP POLICY IF EXISTS "Admin supprime les conversations clubs" ON club_conversations;

-- CLUBS : Voir uniquement leur conversation (comme joueurs avec user_id)
CREATE POLICY "Clubs voient leur conversation"
ON club_conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.club_id IS NOT NULL
    AND profiles.club_id::uuid = club_conversations.club_id
  )
  OR EXISTS (
    SELECT 1 FROM club_admins ca
    INNER JOIN clubs c ON (c.id::text = ca.club_id OR c.slug = ca.club_id)
    WHERE ca.user_id = auth.uid()
    AND c.id = club_conversations.club_id
  )
);

-- CLUBS : Créer leur conversation (comme joueurs)
CREATE POLICY "Clubs créent leur conversation"
ON club_conversations FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.club_id IS NOT NULL
    AND profiles.club_id::uuid = club_id
  )
  OR EXISTS (
    SELECT 1 FROM club_admins ca
    INNER JOIN clubs c ON (c.id::text = ca.club_id OR c.slug = ca.club_id)
    WHERE ca.user_id = auth.uid()
    AND c.id = club_id
  )
);

-- CLUBS : Mettre à jour leur conversation (comme joueurs)
CREATE POLICY "Clubs mettent à jour leur conversation"
ON club_conversations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.club_id IS NOT NULL
    AND profiles.club_id::uuid = club_conversations.club_id
  )
  OR EXISTS (
    SELECT 1 FROM club_admins ca
    INNER JOIN clubs c ON (c.id::text = ca.club_id OR c.slug = ca.club_id)
    WHERE ca.user_id = auth.uid()
    AND c.id = club_conversations.club_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.club_id IS NOT NULL
    AND profiles.club_id::uuid = club_conversations.club_id
  )
  OR EXISTS (
    SELECT 1 FROM club_admins ca
    INNER JOIN clubs c ON (c.id::text = ca.club_id OR c.slug = ca.club_id)
    WHERE ca.user_id = auth.uid()
    AND c.id = club_conversations.club_id
  )
);

-- CLUBS : Voir uniquement leurs messages (comme joueurs)
CREATE POLICY "Clubs voient leurs messages"
ON club_messages FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM club_conversations 
    WHERE EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.club_id IS NOT NULL
      AND profiles.club_id::uuid = club_conversations.club_id
    )
    OR EXISTS (
      SELECT 1 FROM club_admins ca
      INNER JOIN clubs c ON (c.id::text = ca.club_id OR c.slug = ca.club_id)
      WHERE ca.user_id = auth.uid()
      AND c.id = club_conversations.club_id
    )
  )
);

-- CLUBS : Envoyer des messages dans leur conversation (comme joueurs)
CREATE POLICY "Clubs envoient des messages"
ON club_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  is_admin = false AND
  conversation_id IN (
    SELECT id FROM club_conversations 
    WHERE EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.club_id IS NOT NULL
      AND profiles.club_id::uuid = club_conversations.club_id
    )
    OR EXISTS (
      SELECT 1 FROM club_admins ca
      INNER JOIN clubs c ON (c.id::text = ca.club_id OR c.slug = ca.club_id)
      WHERE ca.user_id = auth.uid()
      AND c.id = club_conversations.club_id
    )
  )
);

-- ADMIN : Voir TOUTES les conversations clubs
CREATE POLICY "Admin voit toutes les conversations clubs"
ON club_conversations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- ADMIN : Voir TOUS les messages clubs
CREATE POLICY "Admin voit tous les messages clubs"
ON club_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- ADMIN : Envoyer des messages (INSERT)
CREATE POLICY "Admin envoie des messages clubs"
ON club_messages FOR INSERT
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

-- ADMIN : Mettre à jour les messages (UPDATE)
CREATE POLICY "Admin met à jour les messages clubs"
ON club_messages FOR UPDATE
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

-- ADMIN : Supprimer les conversations
CREATE POLICY "Admin supprime les conversations clubs"
ON club_conversations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- =============================================
-- VUE POUR L'INTERFACE ADMIN
-- =============================================
CREATE OR REPLACE VIEW admin_club_conversations_view AS
SELECT 
  c.id,
  c.club_id,
  c.status,
  c.last_message_at,
  c.last_message_preview,
  c.is_read_by_admin,
  c.created_at,
  clubs.name as club_name,
  clubs.logo_url as club_logo_url,
  clubs.slug as club_slug
FROM club_conversations c
LEFT JOIN clubs ON c.club_id = clubs.id
ORDER BY c.last_message_at DESC;

GRANT SELECT ON admin_club_conversations_view TO authenticated;

-- =============================================
-- ACTIVER REALTIME
-- =============================================
-- Note: Ces commandes doivent être exécutées manuellement dans Supabase Dashboard
-- ALTER PUBLICATION supabase_realtime ADD TABLE club_conversations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE club_messages;

-- Commentaires
COMMENT ON TABLE club_conversations IS 'Conversations entre clubs et admin';
COMMENT ON TABLE club_messages IS 'Messages individuels dans chaque conversation club';
