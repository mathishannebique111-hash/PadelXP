-- ============================================
-- Migration : Suivi des scans du QR code de téléchargement
-- ============================================
-- Chaque ouverture de la page /download (cible du QR code de l'affiche)
-- enregistre une ligne ici. Le compteur affiché côté admin = COUNT(*) réel.

CREATE TABLE IF NOT EXISTS qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL DEFAULT 'download',
    user_agent TEXT,
    referer TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_source ON qr_scans(source);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at);

-- RLS activé sans policy : seul le service role (côté serveur) lit/écrit
-- dans cette table. Aucun accès direct depuis le client anon/authenticated.
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;
