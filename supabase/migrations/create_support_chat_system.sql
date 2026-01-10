-- =============================================
-- SYSTÈME DE CHAT INTERNE JOUEUR ↔ ADMIN
-- =============================================

-- 1. Ajouter la colonne is_admin si pas déjà fait
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- =============================================
-- TABLE 1 : CONVERSATIONS (Une par joueur)
-- =============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  is_read_by_admin BOOLEAN DEFAULT false,
  is_read_by_user BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_club_id ON conversations(club_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_unread_admin ON conversations(is_read_by_admin) WHERE is_read_by_admin = false;

-- =============================================
-- TABLE 2 : MESSAGES (Contenu des échanges)
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file')),
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- =============================================
-- FONCTION : Mettre à jour la conversation automatiquement
-- =============================================
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    is_read_by_admin = CASE 
      WHEN NEW.is_admin = false THEN false
      ELSE is_read_by_admin 
    END,
    is_read_by_user = CASE 
      WHEN NEW.is_admin = true THEN false
      ELSE is_read_by_user 
    END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Joueurs voient leur conversation" ON conversations;
DROP POLICY IF EXISTS "Joueurs créent leur conversation" ON conversations;
DROP POLICY IF EXISTS "Joueurs mettent à jour leur conversation" ON conversations;
DROP POLICY IF EXISTS "Joueurs voient leurs messages" ON messages;
DROP POLICY IF EXISTS "Joueurs envoient des messages" ON messages;
DROP POLICY IF EXISTS "Admin voit toutes les conversations" ON conversations;
DROP POLICY IF EXISTS "Admin voit tous les messages" ON messages;

-- JOUEURS : Voir uniquement leur conversation
CREATE POLICY "Joueurs voient leur conversation"
ON conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Joueurs créent leur conversation"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Joueurs mettent à jour leur conversation"
ON conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- JOUEURS : Voir uniquement leurs messages
CREATE POLICY "Joueurs voient leurs messages"
ON messages FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

-- JOUEURS : Envoyer des messages dans leur conversation
CREATE POLICY "Joueurs envoient des messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  conversation_id IN (
    SELECT id FROM conversations WHERE user_id = auth.uid()
  )
);

-- ADMIN : Voir TOUTES les conversations
CREATE POLICY "Admin voit toutes les conversations"
ON conversations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- ADMIN : Voir TOUS les messages
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

-- ADMIN : Envoyer des messages (INSERT)
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

-- ADMIN : Mettre à jour les messages (UPDATE)
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

-- =============================================
-- VUE POUR L'INTERFACE ADMIN
-- =============================================
CREATE OR REPLACE VIEW admin_conversations_view AS
SELECT 
  c.id,
  c.user_id,
  c.club_id,
  c.status,
  c.last_message_at,
  c.last_message_preview,
  c.is_read_by_admin,
  c.created_at,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.email,
  COALESCE(clubs.name, 'Aucun club') as club_name
FROM conversations c
LEFT JOIN profiles p ON c.user_id = p.id
LEFT JOIN clubs ON c.club_id = clubs.id
ORDER BY c.last_message_at DESC;

GRANT SELECT ON admin_conversations_view TO authenticated;

-- =============================================
-- ACTIVER REALTIME
-- =============================================
-- Note: Ces commandes doivent être exécutées manuellement dans Supabase Dashboard
-- ou via l'API Supabase car ALTER PUBLICATION nécessite des privilèges superuser
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Commentaires
COMMENT ON TABLE conversations IS 'Conversations entre joueurs et admin';
COMMENT ON TABLE messages IS 'Messages individuels dans chaque conversation';
