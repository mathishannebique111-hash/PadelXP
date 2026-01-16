import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import puppeteer from 'puppeteer';

const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  )
  : null;

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Fonction pour traduire les rôles en français
function translateRole(role: string): string {
  const translations: Record<string, string> = {
    'owner': 'Propriétaire',
    'admin': 'Administrateur',
    'member': 'Membre',
    'viewer': 'Lecteur'
  };
  return translations[role?.toLowerCase()] || role || 'Administrateur';
}

// Fonction pour traduire les statuts en français
function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    'active': 'Actif',
    'trialing': 'Période d\'essai',
    'trial': 'Période d\'essai',
    'canceled': 'Résilié',
    'cancelled': 'Résilié',
    'past_due': 'Paiement en retard',
    'inactive': 'Inactif',
    'pending': 'En attente',
    'completed': 'Terminé',
    'confirmed': 'Confirmé'
  };
  return translations[status?.toLowerCase()] || status || 'Actif';
}

// Icônes SVG Lucide (inline pour le PDF)
const icons = {
  user: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  building: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`,
  chart: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>`,
  trophy: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  users: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  target: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`
};

export async function GET(req: NextRequest) {
  let browser = null;

  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }

    logger.info('[RGPD Export] Début export PDF', { userId: user.id.substring(0, 8) });

    // Récupérer les données
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    let club = null;
    let clubAdmin = null;
    let allClubAdmins: any[] = [];
    let membersCount = 0;
    let tournamentsCount = 0;

    // Chercher d'abord dans club_admins pour trouver le club de l'utilisateur
    const { data: userClubAdmin } = await supabaseAdmin
      .from('club_admins')
      .select('*, clubs(*)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userClubAdmin && userClubAdmin.clubs) {
      clubAdmin = userClubAdmin;
      club = userClubAdmin.clubs;

      // Récupérer tous les admins du club
      const { data: clubAdminsData } = await supabaseAdmin
        .from('club_admins')
        .select('*, profiles(full_name)')
        .eq('club_id', club.id);

      allClubAdmins = clubAdminsData || [];

      // Compter les membres du club
      const { count: membersCountResult } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', club.id);
      membersCount = membersCountResult || 0;

      // Compter les tournois créés
      const { count: tournamentsCountResult } = await supabaseAdmin
        .from('tournaments')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', club.id);
      tournamentsCount = tournamentsCountResult || 0;
    }

    // Récupérer les matchs du club
    let matches: any[] = [];
    if (club) {
      const { data: matchesData } = await supabaseAdmin
        .from('matches')
        .select('*')
        .eq('club_id', club.id)
        .order('start_time', { ascending: false });
      matches = matchesData || [];
    }

    // Récupérer les challenges créés par le club
    let challengesCount = 0;
    if (club) {
      const { count: challengesCountResult } = await supabaseAdmin
        .from('challenges')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', club.id);
      challengesCount = challengesCountResult || 0;
    }

    // Générer le HTML
    const exportDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Export des données - PadelXP</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
      padding: 40px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #3b82f6;
    }
    .logo {
      font-size: 32px;
      font-weight: 800;
      color: #3b82f6;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
    }
    .section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #3b82f6;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-title svg {
      flex-shrink: 0;
    }
    .row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .row:last-child { border-bottom: none; }
    .label {
      font-weight: 600;
      color: #475569;
      width: 200px;
      flex-shrink: 0;
    }
    .value { color: #1e293b; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .stat-card {
      background: #f8fafc;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .stat-number {
      font-size: 32px;
      font-weight: 800;
      color: #3b82f6;
    }
    .stat-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
    }
    .match-item {
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .match-date {
      font-weight: 600;
      color: #1e293b;
    }
    .match-info {
      font-size: 13px;
      color: #64748b;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-orange { background: #ffedd5; color: #c2410c; }
    .admin-card {
      background: #f8fafc;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .admin-name { font-weight: 600; color: #1e293b; }
    .admin-email { font-size: 13px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">PadelXP</div>
      <h1 style="font-size: 20px; margin-bottom: 8px;">Export des données du club</h1>
      <p class="subtitle">Conformément au RGPD (Article 20 - Droit à la portabilité)</p>
      <p class="subtitle">Généré le ${exportDate}</p>
    </div>

    <div class="section">
      <div class="section-title">${icons.user} Informations du compte</div>
      <div class="row">
        <span class="label">Identifiant</span>
        <span class="value">${user.id}</span>
      </div>
      <div class="row">
        <span class="label">Email</span>
        <span class="value">${user.email}</span>
      </div>
      <div class="row">
        <span class="label">Date de création</span>
        <span class="value">${user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'Non disponible'}</span>
      </div>
    </div>

    ${club ? `
    <div class="section">
      <div class="section-title">${icons.building} Administration du club</div>
      <div class="row">
        <span class="label">Nom du club</span>
        <span class="value">${club.name}</span>
      </div>
      <div class="row">
        <span class="label">Votre rôle</span>
        <span class="value"><span class="badge badge-blue">${translateRole(clubAdmin?.role)}</span></span>
      </div>
      <div class="row">
        <span class="label">Statut de l'abonnement</span>
        <span class="value"><span class="badge ${club.subscription_status === 'active' ? 'badge-green' : 'badge-orange'}">${translateStatus(club.subscription_status)}</span></span>
      </div>
      <div class="row">
        <span class="label">Date de création</span>
        <span class="value">${club.created_at ? new Date(club.created_at).toLocaleDateString('fr-FR') : 'Non disponible'}</span>
      </div>
      
      ${allClubAdmins.length > 1 ? `
      <div style="margin-top: 20px;">
        <p style="font-weight: 600; color: #475569; margin-bottom: 12px;">Administrateurs du club (${allClubAdmins.length})</p>
        ${allClubAdmins.map(admin => `
          <div class="admin-card">
            <div>
              <div class="admin-name">${admin.profiles?.full_name || 'Non renseigné'}</div>
              <div class="admin-email">${admin.email || 'Email non disponible'}</div>
            </div>
            <span class="badge badge-blue">${translateRole(admin.role)}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">${icons.chart} Statistiques d'activité</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${matches.length}</div>
          <div class="stat-label">Matchs enregistrés</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${membersCount}</div>
          <div class="stat-label">Membres inscrits</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${tournamentsCount}</div>
          <div class="stat-label">Tournois organisés</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${challengesCount}</div>
          <div class="stat-label">Challenges créés</div>
        </div>
      </div>
    </div>

    ${matches.length > 0 ? `
    <div class="section">
      <div class="section-title">${icons.trophy} Historique des matchs (${Math.min(matches.length, 10)} derniers)</div>
      ${matches.slice(0, 10).map(match => `
        <div class="match-item">
          <div class="match-date">${match.start_time ? new Date(match.start_time).toLocaleDateString('fr-FR') : 'Date inconnue'}</div>
          <div class="match-info">Type : ${match.match_type || 'Amical'} • Statut : ${translateStatus(match.status)}</div>
        </div>
      `).join('')}
      ${matches.length > 10 ? `<p style="text-align: center; color: #64748b; margin-top: 12px;">... et ${matches.length - 10} autres matchs</p>` : ''}
    </div>
    ` : ''}

    <div class="footer">
      <p>Document généré automatiquement par PadelXP</p>
      <p>Pour toute question, contactez contact@padelxp.eu</p>
    </div>
  </div>
</body>
</html>
    `;

    // Générer le PDF avec Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();
    browser = null;

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="padelxp-export-${Date.now()}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    if (browser) {
      await browser.close();
    }
    logger.error('[RGPD Export] Erreur', { err: error.message });
    return NextResponse.json(
      { error: `Erreur lors de l'export: ${error.message}` },
      { status: 500 }
    );
  }
}
