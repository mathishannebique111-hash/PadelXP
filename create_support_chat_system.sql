-- ============================================
-- SYSTÈME DE CHAT SUPPORT
-- ============================================
-- Ce script crée les tables nécessaires pour le système de chat dans la page "Aide & Support"
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Créer la table support_conversations
-- ============================================
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  club_name TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_support_conversations_club_id ON public.support_conversations(club_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id ON public.support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON public.support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_conversations_last_message_at ON public.support_conversations(last_message_at DESC);

-- 2. Créer la table support_messages
-- ============================================
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('club', 'admin')),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_email TEXT NOT NULL,
  message_text TEXT NOT NULL,
  html_content TEXT,
  email_message_id TEXT, -- ID de l'email dans Resend (pour éviter les doublons)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_id ON public.support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_email_message_id ON public.support_messages(email_message_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON public.support_messages(created_at DESC);

-- 3. RLS Policies pour support_conversations
-- ============================================
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Clubs can view their own conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Clubs can create their own conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Clubs can update their own conversations" ON public.support_conversations;

-- Policy: Les clubs peuvent voir leurs propres conversations
CREATE POLICY "Clubs can view their own conversations" ON public.support_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.club_id = support_conversations.club_id
    )
  );

-- Policy: Les clubs peuvent créer leurs propres conversations
CREATE POLICY "Clubs can create their own conversations" ON public.support_conversations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.club_id = support_conversations.club_id
    )
    AND auth.uid() = user_id
  );

-- Policy: Les clubs peuvent mettre à jour leurs propres conversations (pour fermer, etc.)
CREATE POLICY "Clubs can update their own conversations" ON public.support_conversations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.club_id = support_conversations.club_id
    )
  );

-- 4. RLS Policies pour support_messages
-- ============================================
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Clubs can view messages in their conversations" ON public.support_messages;
DROP POLICY IF EXISTS "Clubs can create messages in their conversations" ON public.support_messages;

-- Policy: Les clubs peuvent voir les messages de leurs conversations
CREATE POLICY "Clubs can view messages in their conversations" ON public.support_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_conversations sc
      JOIN public.profiles p ON p.club_id = sc.club_id
      WHERE sc.id = support_messages.conversation_id
      AND p.id = auth.uid()
    )
  );

-- Policy: Les clubs peuvent créer des messages dans leurs conversations
CREATE POLICY "Clubs can create messages in their conversations" ON public.support_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_conversations sc
      JOIN public.profiles p ON p.club_id = sc.club_id
      WHERE sc.id = support_messages.conversation_id
      AND p.id = auth.uid()
      AND (support_messages.sender_type = 'club' OR support_messages.sender_id = auth.uid())
    )
  );

-- 5. Fonction pour mettre à jour last_message_at
-- ============================================
CREATE OR REPLACE FUNCTION update_support_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_conversations
  SET last_message_at = NOW(),
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour last_message_at quand un nouveau message est créé
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.support_messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_conversation_last_message();

-- 6. Fonction pour mettre à jour updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_support_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS trigger_update_support_conversations_updated_at ON public.support_conversations;
CREATE TRIGGER trigger_update_support_conversations_updated_at
  BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_support_conversations_updated_at();

