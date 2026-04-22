-- ============================================
-- Coach IA : conversations, messages et rate limiting
-- ============================================

-- 1. Table des conversations
CREATE TABLE IF NOT EXISTS public.coach_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_conversations_user_id ON public.coach_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_conversations_updated ON public.coach_conversations(updated_at DESC);

-- 2. Table des messages
CREATE TABLE IF NOT EXISTS public.coach_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.coach_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_messages_conv ON public.coach_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_coach_messages_created ON public.coach_messages(created_at);

-- 3. Table de rate limiting quotidien
CREATE TABLE IF NOT EXISTS public.coach_daily_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    message_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_coach_usage_lookup ON public.coach_daily_usage(user_id, usage_date);

-- 4. RPC : incrémenter le compteur et retourner la nouvelle valeur
CREATE OR REPLACE FUNCTION public.increment_coach_usage(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_count INTEGER;
BEGIN
    INSERT INTO public.coach_daily_usage (user_id, usage_date, message_count)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET message_count = coach_daily_usage.message_count + 1
    RETURNING message_count INTO new_count;

    RETURN new_count;
END;
$$;

-- 5. RPC : lire le compteur du jour
CREATE OR REPLACE FUNCTION public.get_coach_usage(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_count INTEGER;
BEGIN
    SELECT message_count INTO current_count
    FROM public.coach_daily_usage
    WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

    RETURN COALESCE(current_count, 0);
END;
$$;

-- 6. Trigger : mettre à jour updated_at de la conversation quand un message est inséré
CREATE OR REPLACE FUNCTION public.update_coach_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.coach_conversations
    SET updated_at = now()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coach_message_update_conv ON public.coach_messages;
CREATE TRIGGER trg_coach_message_update_conv
AFTER INSERT ON public.coach_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_coach_conversation_timestamp();

-- 7. RLS
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_daily_usage ENABLE ROW LEVEL SECURITY;

-- coach_conversations
CREATE POLICY "coach_conv_select_own" ON public.coach_conversations
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coach_conv_insert_own" ON public.coach_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coach_conv_update_own" ON public.coach_conversations
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "coach_conv_delete_own" ON public.coach_conversations
    FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "coach_conv_service" ON public.coach_conversations
    FOR ALL USING (auth.role() = 'service_role');

-- coach_messages
CREATE POLICY "coach_msg_select_own" ON public.coach_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.coach_conversations WHERE id = conversation_id AND user_id = auth.uid())
    );
CREATE POLICY "coach_msg_insert_own" ON public.coach_messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.coach_conversations WHERE id = conversation_id AND user_id = auth.uid())
    );
CREATE POLICY "coach_msg_service" ON public.coach_messages
    FOR ALL USING (auth.role() = 'service_role');

-- coach_daily_usage
CREATE POLICY "coach_usage_select_own" ON public.coach_daily_usage
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coach_usage_service" ON public.coach_daily_usage
    FOR ALL USING (auth.role() = 'service_role');

-- 8. Nettoyage des données de rate limiting anciennes (> 7 jours)
CREATE OR REPLACE FUNCTION public.cleanup_coach_daily_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.coach_daily_usage
    WHERE usage_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$;

DO $$ BEGIN RAISE NOTICE '✅ Coach IA : tables, RLS, RPC et triggers créés'; END $$;
