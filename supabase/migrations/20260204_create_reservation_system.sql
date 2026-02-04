-- =============================================
-- SYSTÈME DE RÉSERVATION DE TERRAINS
-- =============================================
-- Ce fichier crée les tables nécessaires pour gérer
-- les réservations de terrains avec paiement partagé.
-- =============================================

-- =============================================
-- TABLE 1 : TERRAINS (COURTS)
-- =============================================

-- Nécessaire pour les contraintes d'exclusion sur UUID (exclude using gist)
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Terrain',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courts_club ON courts(club_id);
CREATE INDEX IF NOT EXISTS idx_courts_active ON courts(is_active) WHERE is_active = true;

-- =============================================
-- TABLE 2 : RÉSERVATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment',  -- En attente de paiement des 4 joueurs
    'confirmed',        -- Tous ont payé, réservation validée
    'cancelled',        -- Annulée manuellement
    'expired'           -- 3h écoulées sans paiement complet
  )),
  payment_method TEXT DEFAULT 'stripe' CHECK (payment_method IN ('stripe', 'on_site')),
  total_price DECIMAL(10,2) DEFAULT 0,
  expires_at TIMESTAMPTZ,  -- Pour le timer de 3h (NULL si on_site)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Empêcher les chevauchements de créneaux sur le même terrain
  CONSTRAINT reservations_no_overlap EXCLUDE USING GIST (
    court_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('pending_payment', 'confirmed'))
);

CREATE INDEX IF NOT EXISTS idx_reservations_court ON reservations(court_id);
CREATE INDEX IF NOT EXISTS idx_reservations_created_by ON reservations(created_by);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_start_time ON reservations(start_time);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON reservations(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================
-- TABLE 3 : PARTICIPANTS À LA RÉSERVATION
-- =============================================
CREATE TABLE IF NOT EXISTS reservation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_organizer BOOLEAN DEFAULT false,
  amount DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
    'pending',   -- N'a pas encore payé
    'paid',      -- A payé sa part
    'refunded'   -- Remboursé (en cas d'annulation)
  )),
  paid_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(reservation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_res_participants_reservation ON reservation_participants(reservation_id);
CREATE INDEX IF NOT EXISTS idx_res_participants_user ON reservation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_res_participants_status ON reservation_participants(payment_status);

-- =============================================
-- AJOUT STRIPE ACCOUNT ID SUR CLUBS
-- =============================================
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- COURTS
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courts_select_all" ON courts;
CREATE POLICY "courts_select_all"
ON courts FOR SELECT
USING (true);  -- Tout le monde peut voir les terrains

DROP POLICY IF EXISTS "courts_insert_club_admin" ON courts;
CREATE POLICY "courts_insert_club_admin"
ON courts FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_admins 
    WHERE club_admins.club_id::uuid = courts.club_id 
    AND club_admins.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "courts_update_club_admin" ON courts;
CREATE POLICY "courts_update_club_admin"
ON courts FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_admins 
    WHERE club_admins.club_id::uuid = courts.club_id 
    AND club_admins.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "courts_delete_club_admin" ON courts;
CREATE POLICY "courts_delete_club_admin"
ON courts FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM club_admins 
    WHERE club_admins.club_id::uuid = courts.club_id 
    AND club_admins.user_id = auth.uid()
  )
);

-- RESERVATIONS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservations_select_all" ON reservations;
CREATE POLICY "reservations_select_all"
ON reservations FOR SELECT
USING (true);  -- Tout le monde peut voir les réservations (pour la dispo)

DROP POLICY IF EXISTS "reservations_insert_authenticated" ON reservations;
CREATE POLICY "reservations_insert_authenticated"
ON reservations FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "reservations_update_creator_or_admin" ON reservations;
CREATE POLICY "reservations_update_creator_or_admin"
ON reservations FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM courts c
    JOIN club_admins ca ON ca.club_id::uuid = c.club_id
    WHERE c.id = reservations.court_id AND ca.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "reservations_delete_creator_or_admin" ON reservations;
CREATE POLICY "reservations_delete_creator_or_admin"
ON reservations FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM courts c
    JOIN club_admins ca ON ca.club_id::uuid = c.club_id
    WHERE c.id = reservations.court_id AND ca.user_id = auth.uid()
  )
);

-- RESERVATION PARTICIPANTS
ALTER TABLE reservation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "res_participants_select_involved" ON reservation_participants;
CREATE POLICY "res_participants_select_involved"
ON reservation_participants FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM reservations r WHERE r.id = reservation_participants.reservation_id AND r.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "res_participants_insert_organizer" ON reservation_participants;
CREATE POLICY "res_participants_insert_organizer"
ON reservation_participants FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM reservations r WHERE r.id = reservation_participants.reservation_id AND r.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "res_participants_update_self" ON reservation_participants;
CREATE POLICY "res_participants_update_self"
ON reservation_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- =============================================
-- TRIGGER : AUTO-CONFIRMATION QUAND 4 PAIEMENTS
-- =============================================
CREATE OR REPLACE FUNCTION check_reservation_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  paid_count INTEGER;
  total_count INTEGER;
BEGIN
  -- Compter les participants payés
  SELECT COUNT(*) FILTER (WHERE payment_status = 'paid'), COUNT(*)
  INTO paid_count, total_count
  FROM reservation_participants
  WHERE reservation_id = NEW.reservation_id;
  
  -- Si tous ont payé, confirmer la réservation
  IF paid_count = total_count AND total_count = 4 THEN
    UPDATE reservations
    SET status = 'confirmed', updated_at = NOW()
    WHERE id = NEW.reservation_id AND status = 'pending_payment';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_reservation_confirmation ON reservation_participants;
CREATE TRIGGER trigger_check_reservation_confirmation
AFTER UPDATE OF payment_status ON reservation_participants
FOR EACH ROW
WHEN (NEW.payment_status = 'paid')
EXECUTE FUNCTION check_reservation_confirmation();

-- =============================================
-- FONCTION : EXPIRER LES RÉSERVATIONS NON PAYÉES
-- =============================================
CREATE OR REPLACE FUNCTION expire_unpaid_reservations()
RETURNS void AS $$
BEGIN
  UPDATE reservations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending_payment'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- MIGRATION DES TERRAINS EXISTANTS
-- =============================================
-- Créer automatiquement les terrains pour les clubs qui ont number_of_courts
DO $$
DECLARE
  club_record RECORD;
  i INTEGER;
BEGIN
  FOR club_record IN 
    SELECT id, number_of_courts 
    FROM clubs 
    WHERE number_of_courts IS NOT NULL AND number_of_courts > 0
  LOOP
    -- Vérifier si des terrains existent déjà
    IF NOT EXISTS (SELECT 1 FROM courts WHERE club_id = club_record.id) THEN
      FOR i IN 1..club_record.number_of_courts LOOP
        INSERT INTO courts (club_id, name, is_active)
        VALUES (club_record.id, 'Terrain ' || i, true);
      END LOOP;
      RAISE NOTICE 'Créé % terrains pour club %', club_record.number_of_courts, club_record.id;
    END IF;
  END LOOP;
END $$;

-- =============================================
-- COMMENTAIRES
-- =============================================
COMMENT ON TABLE courts IS 'Terrains physiques de padel appartenant aux clubs';
COMMENT ON TABLE reservations IS 'Réservations de créneaux horaires sur les terrains';
COMMENT ON TABLE reservation_participants IS 'Joueurs participant à une réservation avec statut de paiement';
COMMENT ON COLUMN clubs.stripe_account_id IS 'ID du compte Stripe Connect du club pour recevoir les paiements';
