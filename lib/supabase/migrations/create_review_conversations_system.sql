-- ============================================
-- SYSTÈME DE CONVERSATIONS POUR AVIS MODÉRÉS
-- ============================================
-- Ce script crée les tables nécessaires pour le système de conversations email pour les avis modérés
-- Exécutez ce script dans Supabase SQL Editor
-- Inspiré du système de support club mais adapté pour les avis modérés

-- 1. Créer la table review_conversations
-- ============================================
CREATE TABLE IF NOT EXISTS public.review_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_review_conversations_review_id ON public.review_conversations(review_id);
CREATE INDEX IF NOT EXISTS idx_review_conversations_user_id ON public.review_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_review_conversations_status ON public.review_conversations(status);
CREATE INDEX IF NOT EXISTS idx_review_conversations_last_message_at ON public.review_conversations(last_message_at DESC);

-- 2. Créer la table review_messages
-- ============================================
CREATE TABLE IF NOT EXISTS public.review_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.review_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('player', 'admin')),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_email TEXT NOT NULL,
  message_text TEXT NOT NULL,
  html_content TEXT,
  email_message_id TEXT, -- ID de l'email dans Resend (pour éviter les doublons)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_review_messages_conversation_id ON public.review_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_review_messages_email_message_id ON public.review_messages(email_message_id);
CREATE INDEX IF NOT EXISTS idx_review_messages_created_at ON public.review_messages(created_at DESC);

-- 3. RLS Policies pour review_conversations
-- ============================================
ALTER TABLE public.review_conversations ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Players can view their own review conversations" ON public.review_conversations;
DROP POLICY IF EXISTS "Players can create their own review conversations" ON public.review_conversations;

-- Policy: Les joueurs peuvent voir leurs propres conversations
CREATE POLICY "Players can view their own review conversations" ON public.review_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les admins peuvent créer des conversations (via service role)
-- Les joueurs créent leurs conversations via l'API qui utilise supabaseAdmin

-- 4. RLS Policies pour review_messages
-- ============================================
ALTER TABLE public.review_messages ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Players can view messages in their conversations" ON public.review_messages;
DROP POLICY IF EXISTS "Players can create messages in their conversations" ON public.review_messages;

-- Policy: Les joueurs peuvent voir les messages de leurs conversations
CREATE POLICY "Players can view messages in their conversations" ON public.review_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.review_conversations rc
      WHERE rc.id = review_messages.conversation_id
      AND rc.user_id = auth.uid()
    )
  );

-- Policy: Les joueurs peuvent créer des messages dans leurs conversations (mais normalement ils n'envoient pas de messages, juste des avis)
-- Les messages sont créés via l'API qui utilise supabaseAdmin

-- 5. Fonction pour mettre à jour last_message_at
-- ============================================
CREATE OR REPLACE FUNCTION update_review_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.review_conversations
  SET last_message_at = NOW(),
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour last_message_at quand un nouveau message est créé
DROP TRIGGER IF EXISTS trigger_update_review_conversation_last_message ON public.review_messages;
CREATE TRIGGER trigger_update_review_conversation_last_message
  AFTER INSERT ON public.review_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_review_conversation_last_message();

-- 6. Fonction pour mettre à jour updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_review_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS trigger_update_review_conversations_updated_at ON public.review_conversations;
CREATE TRIGGER trigger_update_review_conversations_updated_at
  BEFORE UPDATE ON public.review_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_review_conversations_updated_at();

