-- Migration: Update invitation code for "Padel Club"
-- Previous code: TENNISCLUBAMIENSMETROPOLE80000
-- New code: PADELCLUB80000

UPDATE clubs
SET 
  name = 'Padel Club',
  code_invitation = 'PADELCLUB80000',
  updated_at = NOW()
WHERE code_invitation = 'TENNISCLUBAMIENSMETROPOLE80000';

-- Verification
SELECT id, name, code_invitation, slug
FROM clubs
WHERE code_invitation = 'PADELCLUB80000';
