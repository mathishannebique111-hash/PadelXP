-- Ajout de l'option réservations à la table des abonnements
-- Migration pour ajouter l'option "Réservations" aux abonnements
-- Date: 2026-03-08

ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS has_reservations_option BOOLEAN DEFAULT FALSE;

ALTER TABLE clubs
ADD COLUMN IF NOT EXISTS has_reservations_option BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN subscriptions.has_reservations_option IS 'Indique si le club a souscrit à l''option Réservations (39€/mois)';
COMMENT ON COLUMN clubs.has_reservations_option IS 'Cache de l''option Réservations (39€/mois)';
