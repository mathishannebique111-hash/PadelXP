import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserClubInfo, getClubDashboardData, getClubMatchHistory } from "@/lib/utils/club-utils";
import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import { logger } from "@/lib/logger";

function tierForPoints(points: number): { tier: string; color: string; bg: string } {
  if (points >= 500) return { tier: "Champion", color: "#fff", bg: "linear-gradient(135deg, #A855F7, #EC4899)" };
  if (points >= 300) return { tier: "Diamant", color: "#fff", bg: "linear-gradient(135deg, #22D3EE, #3B82F6)" };
  if (points >= 200) return { tier: "Or", color: "#fff", bg: "linear-gradient(135deg, #FBBF24, #D97706)" };
  if (points >= 100) return { tier: "Argent", color: "#fff", bg: "linear-gradient(135deg, #94A3B8, #64748B)" };
  return { tier: "Bronze", color: "#fff", bg: "linear-gradient(135deg, #FB923C, #EA580C)" };
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

    // Top 3 pour le podium
    const top3 = leaderboard.slice(0, 3);

    // Ordre d'affichage du podium: [2ème, 1er, 3ème]
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

    // Styles du podium selon la position
    const podiumStyles = [
      { // 2ème place (argent)
        border: "3px solid #94A3B8",
        bg: "linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 50%, #CBD5E1 100%)",
        shadow: "0 8px 24px rgba(148, 163, 184, 0.3)",
      },
      { // 1ère place (or)
        border: "3px solid #F59E0B",
        bg: "linear-gradient(180deg, #FFFBEB 0%, #FDE68A 50%, #FCD34D 100%)",
        shadow: "0 12px 32px rgba(234, 179, 8, 0.4)",
      },
      { // 3ème place (bronze)
        border: "3px solid #F97316",
        bg: "linear-gradient(180deg, #FFF7ED 0%, #FED7AA 50%, #FDBA74 100%)",
        shadow: "0 8px 24px rgba(249, 115, 22, 0.3)",
      },
    ];

    // Icône utilisateur SVG pour les joueurs sans avatar
    const userIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`;

    // HTML qui reproduit exactement le design du classement
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
      background: linear-gradient(180deg, #0F172A 0%, #1E293B 100%);
      color: #fff;
      padding: 40px;
      min-height: 100vh;
    }
    
    .container { max-width: 900px; margin: 0 auto; }
    
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
      width: 80px;
      background: rgba(255,255,255,0.2);
    }
    .section-title {
      padding: 8px 20px;
      border-radius: 9999px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.05);
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }
    
    /* Podium */
    .podium-container {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 20px;
      margin-bottom: 40px;
    }
    .podium-card {
      width: 180px;
      padding: 24px 16px 20px;
      border-radius: 16px;
      text-align: center;
      position: relative;
    }
    .podium-card.first {
      width: 200px;
      padding: 28px 20px 24px;
      transform: translateY(-10px);
    }
    .podium-medal {
      position: absolute;
      top: -8px;
      right: 8px;
      font-size: 32px;
    }
    .podium-card.first .podium-medal {
      font-size: 40px;
      top: -12px;
    }
    .podium-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin: 0 auto 12px;
      border: 3px solid rgba(255,255,255,0.5);
      overflow: hidden;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .podium-card.first .podium-avatar {
      width: 100px;
      height: 100px;
    }
    .podium-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .podium-name {
      font-size: 16px;
      font-weight: 700;
      color: #1F2937;
      margin-top: 8px;
    }
    .podium-card.first .podium-name {
      font-size: 18px;
    }
    
    /* Table */
    .table-wrapper {
      border-radius: 12px;
      overflow: hidden;
      background: #fff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead tr {
      background: #F8FAFC;
      border-bottom: 2px solid #E2E8F0;
    }
    th {
      padding: 14px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      text-align: center;
    }
    th.joueur { text-align: left; padding-left: 20px; }
    th.v-col { color: #10B981; }
    th.d-col { color: #EF4444; }
    
    tbody tr {
      border-bottom: 1px solid #E2E8F0;
    }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: #F8FAFC; }
    td {
      padding: 12px;
      font-size: 14px;
      color: #1F2937;
      text-align: center;
      vertical-align: middle;
    }
    td.joueur-cell { 
      text-align: left; 
      padding-left: 20px;
    }
    .joueur-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .joueur-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .joueur-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .joueur-name {
      font-weight: 600;
      color: #1F2937;
    }
    
    .rang-num {
      font-weight: 700;
      color: #475569;
    }
    
    .tier-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
    }
    
    td.points-cell { font-weight: 700; color: #1F2937; }
    td.winrate-good { color: #10B981; font-weight: 600; }
    td.winrate-bad { color: #EF4444; font-weight: 600; }
    td.winrate-neutral { color: #3B82F6; font-weight: 600; }
    td.v-cell { color: #10B981; font-weight: 600; background: #F0FDF4; }
    td.d-cell { color: #EF4444; font-weight: 600; background: #FEF2F2; }
    td.matches-cell { font-weight: 500; color: #64748B; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Top joueurs section -->
    <div class="section-header">
      <span class="section-line"></span>
      <span class="section-title">Top joueurs du moment</span>
      <span class="section-line"></span>
    </div>
    
    <div class="podium-container">
      ${podiumOrder.map((player, displayIndex) => {
      // Déterminer la vraie position (displayIndex 0=2ème, 1=1er, 2=3ème)
      const realRank = displayIndex === 0 ? 2 : displayIndex === 1 ? 1 : 3;
      const styleIndex = displayIndex;
      const style = podiumStyles[styleIndex];
      const isFirst = realRank === 1;
      const medal = realRank === 1 ? "🥇" : realRank === 2 ? "🥈" : "🥉";

      // Extraire prénom et initiale du nom
      const nameParts = player.player_name.trim().split(' ');
      const firstName = nameParts[0] || 'Joueur';
      const lastInitial = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + '.' : '';

      return `
        <div class="podium-card ${isFirst ? 'first' : ''}" style="border: ${style.border}; background: ${style.bg}; box-shadow: ${style.shadow};">
          <span class="podium-medal">${medal}</span>
          <div class="podium-avatar">
            ${player.avatar_url
          ? `<img src="${player.avatar_url}" alt="${firstName}" />`
          : userIconSvg
        }
          </div>
          <div class="podium-name">${firstName} ${lastInitial}</div>
        </div>
        `;
    }).join('')}
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
            <th class="joueur">Joueur</th>
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
      const tierInfo = tierForPoints(player.points);
      const winrateClass = winRate >= 51 ? 'winrate-good' : winRate <= 49 && winRate > 0 ? 'winrate-bad' : 'winrate-neutral';

      // Extraire prénom et initiale du nom
      const nameParts = player.player_name.trim().split(' ');
      const firstName = nameParts[0] || 'Joueur';
      const lastInitial = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + '.' : '';

      return `
            <tr>
              <td class="rang-num">${player.rank}</td>
              <td class="joueur-cell">
                <div class="joueur-info">
                  <div class="joueur-avatar">
                    ${player.avatar_url
          ? `<img src="${player.avatar_url}" alt="${firstName}" />`
          : userIconSvg
        }
                  </div>
                  <span class="joueur-name">${firstName} ${lastInitial}</span>
                </div>
              </td>
              <td><span class="tier-badge" style="background: ${tierInfo.bg};">${tierInfo.tier}</span></td>
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
