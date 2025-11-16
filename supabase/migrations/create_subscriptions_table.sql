-- ============================================
-- TABLE: subscriptions
-- ============================================
-- Table pour gérer les abonnements des clubs avec états, essais, paiements

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  
  -- États d'abonnement
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN (
    'trialing',
    'scheduled_activation',
    'active',
    'paused',
    'canceled',
    'past_due'
  )),
  
  -- Dates essai
  trial_start_at TIMESTAMPTZ,
  trial_end_at TIMESTAMPTZ,
  
  -- Plan et cycle
  plan_cycle TEXT CHECK (plan_cycle IN ('monthly', 'quarterly', 'annual')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_renewal_at TIMESTAMPTZ,
  
  -- Moyen de paiement
  has_payment_method BOOLEAN DEFAULT false,
  payment_method_id TEXT, -- ID Stripe ou autre fournisseur
  payment_method_last4 TEXT,
  payment_method_type TEXT, -- 'card', 'sepa', etc.
  payment_method_brand TEXT, -- 'visa', 'mastercard', etc.
  payment_method_expiry TEXT, -- 'MM/YY'
  
  -- Consentement et activation
  auto_activate_at_trial_end BOOLEAN DEFAULT false,
  cancel_at_period_end BOOLEAN DEFAULT false,
  
  -- Période de grâce
  grace_until TIMESTAMPTZ,
  
  -- Détails de facturation
  billing_email TEXT,
  billing_address JSONB, -- { street, postal, city, country }
  legal_name TEXT,
  vat_number TEXT,
  
  -- Informations Stripe (si utilisé)
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contraintes
  UNIQUE(club_id) -- Un club ne peut avoir qu'un seul abonnement actif
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_subscriptions_club_id ON public.subscriptions(club_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end_at ON public.subscriptions(trial_end_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_renewal_at ON public.subscriptions(next_renewal_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_until ON public.subscriptions(grace_until);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- ============================================
-- TABLE: subscription_notifications
-- ============================================
-- Table pour tracker les notifications envoyées

CREATE TABLE IF NOT EXISTS public.subscription_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'trial_ending_10_days',
    'trial_ending_3_days',
    'trial_ending_1_day',
    'trial_ended',
    'payment_failed',
    'subscription_activated',
    'subscription_canceled',
    'subscription_paused',
    'subscription_resumed',
    'payment_succeeded'
  )),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_to_email TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_subscription_notifications_subscription_id ON public.subscription_notifications(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_notifications_type ON public.subscription_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_subscription_notifications_sent_at ON public.subscription_notifications(sent_at);

-- ============================================
-- TABLE: subscription_events
-- ============================================
-- Table pour auditer tous les événements d'abonnement

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  triggered_by TEXT, -- 'system', 'user', 'webhook'
  triggered_by_user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON public.subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON public.subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON public.subscription_events(created_at);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Policies pour subscriptions
-- Les administrateurs du club peuvent voir/modifier leur abonnement
CREATE POLICY "Club admins can view their subscription"
  ON public.subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.club_admins
      WHERE club_admins.club_id::uuid = subscriptions.club_id
      AND club_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage all subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);
  -- Note: Cette policy est pour les fonctions service_role uniquement

-- Policies pour subscription_notifications
CREATE POLICY "Club admins can view their notifications"
  ON public.subscription_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions
      JOIN public.club_admins ON club_admins.club_id::uuid = subscriptions.club_id
      WHERE subscriptions.id = subscription_notifications.subscription_id
      AND club_admins.user_id = auth.uid()
    )
  );

-- Policies pour subscription_events
CREATE POLICY "Club admins can view their events"
  ON public.subscription_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions
      JOIN public.club_admins ON club_admins.club_id::uuid = subscriptions.club_id
      WHERE subscriptions.id = subscription_events.subscription_id
      AND club_admins.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTION: Initialize subscription for club
-- ============================================
-- Crée un abonnement en essai pour un nouveau club

CREATE OR REPLACE FUNCTION initialize_club_subscription(p_club_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription_id UUID;
  v_trial_start TIMESTAMPTZ;
  v_trial_end TIMESTAMPTZ;
BEGIN
  -- Récupérer trial_start depuis clubs
  SELECT trial_start INTO v_trial_start
  FROM public.clubs
  WHERE id = p_club_id;
  
  -- Si trial_start n'existe pas, utiliser NOW()
  IF v_trial_start IS NULL THEN
    v_trial_start := NOW();
    -- Mettre à jour clubs.trial_start
    UPDATE public.clubs
    SET trial_start = v_trial_start
    WHERE id = p_club_id;
  END IF;
  
  -- Calculer trial_end (30 jours)
  v_trial_end := v_trial_start + INTERVAL '30 days';
  
  -- Créer l'abonnement
  INSERT INTO public.subscriptions (
    club_id,
    status,
    trial_start_at,
    trial_end_at,
    has_payment_method,
    auto_activate_at_trial_end
  )
  VALUES (
    p_club_id,
    'trialing',
    v_trial_start,
    v_trial_end,
    false,
    false
  )
  RETURNING id INTO v_subscription_id;
  
  -- Logger l'événement
  INSERT INTO public.subscription_events (
    subscription_id,
    event_type,
    from_status,
    to_status,
    triggered_by,
    metadata
  )
  VALUES (
    v_subscription_id,
    'subscription_initialized',
    NULL,
    'trialing',
    'system',
    jsonb_build_object('trial_end_at', v_trial_end)
  );
  
  RETURN v_subscription_id;
END;
$$;

-- ============================================
-- FUNCTION: Transition subscription status
-- ============================================
-- Fonction utilitaire pour gérer les transitions d'état

CREATE OR REPLACE FUNCTION transition_subscription_status(
  p_subscription_id UUID,
  p_new_status TEXT,
  p_triggered_by TEXT DEFAULT 'user',
  p_triggered_by_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status TEXT;
  v_is_valid_transition BOOLEAN;
BEGIN
  -- Récupérer l'ancien statut
  SELECT status INTO v_old_status
  FROM public.subscriptions
  WHERE id = p_subscription_id;
  
  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;
  
  -- Valider la transition (logique simplifiée - à adapter selon besoins)
  -- trialing -> scheduled_activation, active, paused, canceled
  -- scheduled_activation -> active, canceled
  -- active -> paused, canceled, past_due
  -- paused -> active, canceled
  -- past_due -> active, paused, canceled
  -- canceled -> (aucune transition)
  
  v_is_valid_transition := CASE
    WHEN v_old_status = 'trialing' AND p_new_status IN ('scheduled_activation', 'active', 'paused', 'canceled') THEN true
    WHEN v_old_status = 'scheduled_activation' AND p_new_status IN ('active', 'canceled') THEN true
    WHEN v_old_status = 'active' AND p_new_status IN ('paused', 'canceled', 'past_due') THEN true
    WHEN v_old_status = 'paused' AND p_new_status IN ('active', 'canceled') THEN true
    WHEN v_old_status = 'past_due' AND p_new_status IN ('active', 'paused', 'canceled') THEN true
    ELSE false
  END;
  
  IF NOT v_is_valid_transition THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', v_old_status, p_new_status;
  END IF;
  
  -- Effectuer la transition
  UPDATE public.subscriptions
  SET status = p_new_status
  WHERE id = p_subscription_id;
  
  -- Logger l'événement
  INSERT INTO public.subscription_events (
    subscription_id,
    event_type,
    from_status,
    to_status,
    triggered_by,
    triggered_by_user_id,
    metadata
  )
  VALUES (
    p_subscription_id,
    'status_transition',
    v_old_status,
    p_new_status,
    p_triggered_by,
    p_triggered_by_user_id,
    p_metadata
  );
  
  RETURN true;
END;
$$;

