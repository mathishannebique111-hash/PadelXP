-- ============================================
-- TABLE: admin_messages
-- ============================================
-- Table pour gérer les messages des clubs et joueurs vers les admins

CREATE TABLE IF NOT EXISTS public.admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('club', 'player')),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_admin_messages_sender_id ON public.admin_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON public.admin_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_messages_is_read ON public.admin_messages(is_read);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Les admins peuvent lire tous les messages
CREATE POLICY "Admins can read all messages"
  ON public.admin_messages
  FOR SELECT
  USING (
    auth.email() IN ('contactpadelxp@gmail.com', 'mathis.hannebique111@gmail.com')
  );

-- Policy: Les utilisateurs peuvent insérer leurs propres messages
CREATE POLICY "Users can insert their own messages"
  ON public.admin_messages
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Policy: Les admins peuvent mettre à jour les messages (marquer comme lu)
CREATE POLICY "Admins can update messages"
  ON public.admin_messages
  FOR UPDATE
  USING (
    auth.email() IN ('contactpadelxp@gmail.com', 'mathis.hannebique111@gmail.com')
  );

