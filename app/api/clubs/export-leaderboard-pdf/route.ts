import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserClubInfo, getClubDashboardData, getClubMatchHistory } from "@/lib/utils/club-utils";
import puppeteer from "puppeteer";

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

    const top3 = leaderboard.slice(0, 3);
    const totalPlayers = leaderboard.length;
    const totalMatches = history.matches.length;

    // Générer le HTML simple pour le PDF
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Classement</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #f5f5f5;
      color: #333;
      padding: 40px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: #fff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .title {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 30px;
      text-align: center;
      color: #333;
    }
    .stats {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-bottom: 40px;
    }
    .stat-badge {
      padding: 10px 20px;
      border-radius: 20px;
      background: #e3f2fd;
      font-size: 14px;
      font-weight: 600;
      color: #1976d2;
    }
    .top3-section {
      margin-bottom: 50px;
    }
    .top3-title {
      text-align: center;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 30px;
      color: #333;
    }
    .top3-container {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 20px;
    }
    .podium-card {
      border-radius: 12px;
      padding: 30px 20px;
      text-align: center;
      position: relative;
      border: 3px solid;
      min-height: 250px;
      flex: 1;
      max-width: 250px;
    }
    .podium-2 {
      background: #f5f5f5;
      border-color: #9e9e9e;
    }
    .podium-1 {
      background: #fff9c4;
      border-color: #fbc02d;
    }
    .podium-3 {
      background: #ffe0b2;
      border-color: #ff9800;
    }
    .podium-emoji {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 40px;
    }
    .podium-name {
      font-size: 20px;
      font-weight: 700;
      color: #333;
      margin-bottom: 15px;
    }
    .podium-points {
      font-size: 24px;
      font-weight: 800;
      color: #333;
      margin-top: 20px;
    }
    .meilleur-joueur-badge {
      position: absolute;
      top: -10px;
      left: -10px;
      padding: 4px 10px;
      border-radius: 15px;
      background: #fff59d;
      color: #f57f17;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid #fbc02d;
    }
    .leaderboard-section {
      margin-top: 40px;
    }
    .leaderboard-title {
      text-align: center;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    thead {
      background: #f5f5f5;
    }
    th {
      padding: 12px;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #666;
      border-bottom: 2px solid #ddd;
    }
    tbody tr {
      background: #fff;
      border-bottom: 1px solid #eee;
    }
    tbody tr:hover {
      background: #f9f9f9;
    }
    td {
      padding: 12px;
      text-align: center;
      font-size: 14px;
      color: #333;
    }
    .rank-badge {
      display: inline-block;
      width: 30px;
      height: 30px;
      line-height: 30px;
      border-radius: 50%;
      font-weight: 700;
      font-size: 12px;
      color: #fff;
      text-align: center;
    }
    .rank-1 { background: #ffd700; }
    .rank-2 { background: #c0c0c0; }
    .rank-3 { background: #cd7f32; }
    .rank-default { background: #2196f3; }
    .tier-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
    }
    .tier-Bronze { background: #cd7f32; }
    .tier-Argent { background: #c0c0c0; color: #333; }
    .tier-Or { background: #ffd700; color: #333; }
    .tier-Diamant { background: #b9f2ff; color: #333; }
    .tier-Champion { background: #ff1493; }
    .winrate { color: #4caf50; font-weight: 600; }
    .wins { color: #4caf50; font-weight: 600; }
    .losses { color: #f44336; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="title">Classement</h1>
    
    <div class="stats">
      <span class="stat-badge">👥 ${totalPlayers} joueur${totalPlayers > 1 ? 's' : ''}</span>
      <span class="stat-badge">📊 ${totalMatches} match${totalMatches > 1 ? 's' : ''} comptabilisé${totalMatches > 1 ? 's' : ''}</span>
    </div>

    ${top3.length > 0 ? `
    <div class="top3-section">
      <div class="top3-title">Top joueurs du moment</div>
      <div class="top3-container">
        ${top3[1] ? `
        <div class="podium-card podium-2">
          <div class="podium-emoji">🥈</div>
          <div class="podium-name">${top3[1].player_name}</div>
          <div class="podium-points">${top3[1].points.toLocaleString()} points</div>
        </div>
        ` : ''}
        ${top3[0] ? `
        <div class="podium-card podium-1">
          <div class="meilleur-joueur-badge">Meilleur joueur</div>
          <div class="podium-emoji">🥇</div>
          <div class="podium-name">${top3[0].player_name}</div>
          <div class="podium-points">${top3[0].points.toLocaleString()} points</div>
        </div>
        ` : ''}
        ${top3[2] ? `
        <div class="podium-card podium-3">
          <div class="podium-emoji">🥉</div>
          <div class="podium-name">${top3[2].player_name}</div>
          <div class="podium-points">${top3[2].points.toLocaleString()} points</div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    <div class="leaderboard-section">
      <div class="leaderboard-title">Classement global</div>
      <table>
        <thead>
          <tr>
            <th>Rang</th>
            <th>Joueur</th>
            <th>Niveau</th>
            <th>Points</th>
            <th>Winrate</th>
            <th>V</th>
            <th>D</th>
            <th>MJ</th>
          </tr>
        </thead>
        <tbody>
          ${leaderboard.map((player) => {
            const winRate = player.matches > 0 ? Math.round((player.wins / player.matches) * 100) : 0;
            const tier = tierForPoints(player.points);
            const rankClass = player.rank === 1 ? 'rank-1' : player.rank === 2 ? 'rank-2' : player.rank === 3 ? 'rank-3' : 'rank-default';
            return `
            <tr>
              <td><span class="rank-badge ${rankClass}">#${player.rank}</span></td>
              <td style="font-weight: 600;">${player.player_name}</td>
              <td><span class="tier-badge tier-${tier}">${tier}</span></td>
              <td style="font-weight: 600;">${player.points}</td>
              <td class="winrate">${winRate}%</td>
              <td class="wins">${player.wins}</td>
              <td class="losses">${player.losses}</td>
              <td style="font-weight: 600;">${player.matches}</td>
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

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    await browser.close();

    const fileName = `classement_club_${clubId}_${new Date().toISOString().slice(0, 10)}.pdf`;

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
    console.error('[export-leaderboard-pdf] Unexpected error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur serveur inattendue' },
      { status: 500 }
    );
  }
}
