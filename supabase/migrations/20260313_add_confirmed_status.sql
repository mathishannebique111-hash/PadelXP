-- Ajout de l'état 'confirmed' pour le système sans paiement
ALTER TABLE reservation_participants 
DROP CONSTRAINT IF EXISTS reservation_participants_payment_status_check;

ALTER TABLE reservation_participants 
ADD CONSTRAINT reservation_participants_payment_status_check 
CHECK (payment_status IN ('pending', 'paid', 'refunded', 'confirmed'));

-- Ajouter une clé étrangère explicite vers profiles pour faciliter les joins PostgREST
ALTER TABLE reservation_participants
DROP CONSTRAINT IF EXISTS reservation_participants_user_id_profiles_fkey;

ALTER TABLE reservation_participants
ADD CONSTRAINT reservation_participants_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

COMMENT ON COLUMN reservation_participants.payment_status IS 'pending, paid, refunded, confirmed (pour le système sans paiement)';
