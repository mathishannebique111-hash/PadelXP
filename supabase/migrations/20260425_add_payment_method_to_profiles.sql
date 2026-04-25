-- Ajouter le champ payment_method à profiles pour tracker la source de paiement
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_since TIMESTAMPTZ;
