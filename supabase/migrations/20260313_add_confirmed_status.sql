-- Ajout de l'état 'confirmed' pour le système sans paiement
ALTER TABLE reservation_participants 
DROP CONSTRAINT IF EXISTS reservation_participants_payment_status_check;

ALTER TABLE reservation_participants 
ADD CONSTRAINT reservation_participants_payment_status_check 
CHECK (payment_status IN ('pending', 'paid', 'refunded', 'confirmed'));

COMMENT ON COLUMN reservation_participants.payment_status IS 'pending, paid, refunded, confirmed (pour le système sans paiement)';
