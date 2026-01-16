import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserClubInfo, getClubDashboardData, getClubMatchHistory } from "@/lib/utils/club-utils";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import fs from "fs";
import path from "path";
import { logger } from "@/lib/logger";

function tierForPoints(points: number): "Bronze" | "Argent" | "Or" | "Diamant" | "Champion" {
  if (points >= 500) return "Champion";
  if (points >= 300) return "Diamant";
  if (points >= 200) return "Or";
  if (points >= 100) return "Argent";
  return "Bronze";
}

export async function GET() {
  let browser;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { clubId, clubSlug } = await getUserClubInfo();

    if (!clubId) {
      return NextResponse.json(
        { error: "Vous n'êtes associé à aucun club." },
        { status: 403 }
      );
    }

    const { leaderboard } = await getClubDashboardData(clubId, clubSlug);
    const history = await getClubMatchHistory(clubId, clubSlug);

    if (!leaderboard || leaderboard.length === 0) {
      return NextResponse.json(
        { error: "Aucun classement disponible." },
        { status: 404 }
      );
    }

    const totalPlayers = leaderboard.length;
    const totalMatches = history.matches.length;

    // Lire l'image de médaille et la convertir en base64
    const medal1Path = path.join(process.cwd(), "public/images/Médaille top1.png");
    const medal1Base64 = fs.existsSync(medal1Path) ? fs.readFileSync(medal1Path).toString("base64") : "";
    const medal1Src = medal1Base64 ? `data:image/png;base64,${medal1Base64}` : "";

    // Le top joueur
    const topPlayer = leaderboard[0];

    // Icônes SVG
    const usersIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    const chartIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>`;

    // HTML qui reproduit EXACTEMENT le design de la page classement
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Classement</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #000000;
      color: #fff;
      padding: 40px;
    }
    
    .container { max-width: 900px; margin: 0 auto; }
    
    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .title {
      font-size: 26px;
      font-weight: 800;
      color: #fff;
    }
    .badges {
      display: flex;
      gap: 12px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border-radius: 9999px;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(124, 58, 237, 0.3) 100%);
      border: 1px solid rgba(255,255,255,0.15);
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }
    .badge svg { opacity: 0.9; }
    
    /* Section dividers */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin: 32px 0 28px;
    }
    .section-line {
      height: 1px;
      width: 60px;
      background: rgba(255,255,255,0.25);
    }
    .section-title {
      padding: 6px 18px;
      border-radius: 9999px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.08);
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }
    
    /* Top player card - EXACT match to screenshot */
    .top-card-container {
      display: flex;
      justify-content: center;
      margin-bottom: 40px;
    }
    .top-card {
      position: relative;
      width: 280px;
      padding: 28px 24px 24px;
      border-radius: 20px;
      border: 3px solid rgba(234, 179, 8, 0.7);
      background: linear-gradient(180deg, #FFF9E6 0%, #FFE9A0 50%, #FFD644 100%);
      box-shadow: 0 0 40px rgba(234, 179, 8, 0.25), 0 8px 32px rgba(0,0,0,0.2);
      text-align: center;
    }
    .top-badge {
      position: absolute;
      top: -12px;
      left: 20px;
      padding: 5px 14px;
      border-radius: 9999px;
      background: #FEF3C7;
      color: #92400E;
      font-size: 13px;
      font-weight: 700;
      border: 2px solid #FCD34D;
    }
    .top-medal {
      position: absolute;
      top: 8px;
      right: 12px;
      width: 52px;
      height: 52px;
    }
    .top-name {
      font-size: 22px;
      font-weight: 800;
      color: #1F2937;
      margin: 12px 0 20px;
    }
    .top-points {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 24px;
      border-radius: 9999px;
      background: #fff;
      border: 2px solid rgba(0,0,0,0.08);
      font-size: 18px;
      font-weight: 800;
      color: #1F2937;
    }
    .top-points-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6B7280;
    }
    
    /* Table */
    .table-wrapper {
      border-radius: 16px;
      overflow: hidden;
      border: 3px solid rgba(255,255,255,0.6);
      background: #fff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead tr {
      background: #F8FAFC;
    }
    th {
      padding: 14px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #374151;
      text-align: center;
      border-left: 1px solid #E5E7EB;
    }
    th:first-child { border-left: none; }
    th.v-col { color: #10B981; background: #F0FDF4; }
    th.d-col { color: #EF4444; background: #FEF2F2; }
    
    tbody tr {
      border-bottom: 1px solid #E5E7EB;
    }
    tbody tr:last-child { border-bottom: none; }
    td {
      padding: 14px 12px;
      font-size: 14px;
      color: #1F2937;
      text-align: center;
      border-left: 1px solid #E5E7EB;
    }
    td:first-child { border-left: none; }
    td.player-cell { text-align: left; font-weight: 600; }
    td.v-cell { color: #10B981; background: #F0FDF4; font-weight: 600; }
    td.d-cell { color: #EF4444; background: #FEF2F2; font-weight: 600; }
    td.points-cell { font-weight: 700; }
    td.matches-cell { font-weight: 600; color: #6B7280; }
    
    /* Rank badge */
    .rank {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 13px;
      font-weight: 800;
      color: #fff;
    }
    .rank-1 { background: linear-gradient(135deg, #FBBF24, #F59E0B); }
    .rank-2 { background: linear-gradient(135deg, #CBD5E1, #94A3B8); }
    .rank-3 { background: linear-gradient(135deg, #FB923C, #EA580C); }
    .rank-default { background: linear-gradient(135deg, #3B82F6, #2563EB); }
    
    /* Tier badge */
    .tier {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
    }
    .tier-Bronze { background: linear-gradient(135deg, #FB923C, #EA580C); }
    .tier-Argent { background: linear-gradient(135deg, #94A3B8, #64748B); }
    .tier-Or { background: linear-gradient(135deg, #FBBF24, #D97706); }
    .tier-Diamant { background: linear-gradient(135deg, #22D3EE, #0EA5E9); }
    .tier-Champion { background: linear-gradient(135deg, #A855F7, #EC4899); }
    
    /* Winrate colors */
    .winrate-good { color: #10B981; font-weight: 600; }
    .winrate-bad { color: #EF4444; font-weight: 600; }
    .winrate-neutral { color: #3B82F6; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1 class="title">Classement</h1>
      <div class="badges">
        <span class="badge">${usersIcon} ${totalPlayers} joueur${totalPlayers > 1 ? 's' : ''}</span>
        <span class="badge">${chartIcon} ${totalMatches} match${totalMatches > 1 ? 's' : ''} comptabilisé${totalMatches > 1 ? 's' : ''}</span>
      </div>
    </div>
    
    <!-- Top joueurs section -->
    <div class="section-header">
      <span class="section-line"></span>
      <span class="section-title">Top joueurs du moment</span>
      <span class="section-line"></span>
    </div>
    
    <div class="top-card-container">
      <div class="top-card">
        <div class="top-badge">Meilleur joueur</div>
        ${medal1Src ? `<img src="${medal1Src}" alt="" class="top-medal" />` : ''}
        <h2 class="top-name">${topPlayer.player_name}</h2>
        <div class="top-points">
          <span>${topPlayer.points}</span>
          <span class="top-points-label">POINTS</span>
        </div>
      </div>
    </div>
    
    <!-- Classement global section -->
    <div class="section-header">
      <span class="section-line"></span>
      <span class="section-title">Classement global</span>
      <span class="section-line"></span>
    </div>
    
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Rang</th>
            <th>Joueur</th>
            <th>Niveau</th>
            <th>Points</th>
            <th>Winrate</th>
            <th class="v-col">V</th>
            <th class="d-col">D</th>
            <th>MJ</th>
          </tr>
        </thead>
        <tbody>
          ${leaderboard.map((player) => {
      const winRate = player.matches > 0 ? Math.round((player.wins / player.matches) * 100) : 0;
      const tier = tierForPoints(player.points);
      const rankClass = player.rank <= 3 ? `rank-${player.rank}` : 'rank-default';
      const winrateClass = winRate >= 51 ? 'winrate-good' : winRate === 50 ? 'winrate-neutral' : 'winrate-bad';
      return `
            <tr>
              <td><span class="rank ${rankClass}">#${player.rank}</span></td>
              <td class="player-cell">${player.player_name}</td>
              <td><span class="tier tier-${tier}">${tier}</span></td>
              <td class="points-cell">${player.points}</td>
              <td class="${winrateClass}">${winRate}%</td>
              <td class="v-cell">${player.wins}</td>
              <td class="d-cell">${player.losses}</td>
              <td class="matches-cell">${player.matches}</td>
            </tr>
            `;
    }).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
    `;

    // Configuration Puppeteer
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isVercel) {
      logger.info('[export-leaderboard-pdf] Using @sparticuz/chromium for Vercel');
      browser = await puppeteer.launch({
        args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        defaultViewport: { width: 1200, height: 800 },
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      logger.info('[export-leaderboard-pdf] Using local Chrome/Chromium');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });

    await browser.close();

    const fileName = `classement_${new Date().toISOString().slice(0, 10)}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    if (browser) {
      await browser.close();
    }
    logger.error('[export-leaderboard-pdf] Unexpected error', { error: error?.message || String(error) });
    return NextResponse.json(
      { error: error?.message || 'Erreur serveur inattendue' },
      { status: 500 }
    );
  }
}
