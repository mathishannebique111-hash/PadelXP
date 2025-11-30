import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserClubInfo, getClubDashboardData, getClubMatchHistory } from "@/lib/utils/club-utils";
import puppeteer from "puppeteer-core";
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

    const top3 = leaderboard.slice(0, 3);
    const totalPlayers = leaderboard.length;
    const totalMatches = history.matches.length;

    // Lire les images de médailles et les convertir en base64
    const medal1Path = path.join(process.cwd(), "public/images/Médaille top1.png");
    const medal2Path = path.join(process.cwd(), "public/images/Médaille top2.png");
    const medal3Path = path.join(process.cwd(), "public/images/Médaille top3.png");
    const medal1Base64 = fs.existsSync(medal1Path) ? fs.readFileSync(medal1Path).toString("base64") : "";
    const medal2Base64 = fs.existsSync(medal2Path) ? fs.readFileSync(medal2Path).toString("base64") : "";
    const medal3Base64 = fs.existsSync(medal3Path) ? fs.readFileSync(medal3Path).toString("base64") : "";
    const medal1Src = medal1Base64 ? `data:image/png;base64,${medal1Base64}` : "";
    const medal2Src = medal2Base64 ? `data:image/png;base64,${medal2Base64}` : "";
    const medal3Src = medal3Base64 ? `data:image/png;base64,${medal3Base64}` : "";

    // Générer le HTML qui reproduit fidèlement la page classement
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Classement</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #000000;
      color: #fff;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    /* Header section */
    .header {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.025em;
    }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .stat-badge {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: linear-gradient(135deg, rgba(0,102,255,0.25) 0%, rgba(76,29,149,0.25) 100%);
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      overflow: hidden;
      outline: 1px solid rgba(255,255,255,0.2);
      outline-offset: -1px;
    }
    .stat-badge img {
      width: 16px;
      height: 16px;
      object-fit: contain;
    }
    
    /* Top 3 Section */
    .top3-section {
      margin-bottom: 32px;
    }
    .top3-title-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .top3-title-wrapper::before,
    .top3-title-wrapper::after {
      content: '';
      height: 1px;
      flex: 1;
      max-width: 96px;
      background: rgba(255,255,255,0.2);
    }
    .top3-title {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.1);
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .top3-container {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 24px;
      width: 100%;
    }
    
    /* Podium cards - exact same as page */
    .podium-card {
      border-radius: 16px;
      text-align: center;
      position: relative;
      overflow: visible;
    }
    .podium-2 {
      flex: 1;
      max-width: 240px;
      padding: 32px 24px;
      border: 4px solid rgba(148, 163, 184, 0.8);
      background: linear-gradient(to bottom, #ffffff, #d8d8d8, #b8b8b8);
      box-shadow: 0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(192, 192, 192, 0.35), inset 0 2px 4px rgba(255,255,255,0.5);
    }
    .podium-1 {
      flex: 1.2;
      max-width: 280px;
      padding: 36px 28px;
      border: 4px solid rgba(234, 179, 8, 0.8);
      background: linear-gradient(to bottom, #ffffff, #ffe8a1, #ffdd44);
      box-shadow: 0 6px 25px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 140px rgba(255, 215, 0, 0.4), inset 0 2px 6px rgba(255,255,255,0.6);
    }
    .podium-3 {
      flex: 1;
      max-width: 240px;
      padding: 32px 24px;
      border: 4px solid rgba(234, 88, 12, 0.8);
      background: linear-gradient(to bottom, #ffffff, #ffd8b3, #ffc085);
      box-shadow: 0 4px 20px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 0 120px rgba(205, 127, 50, 0.35), inset 0 2px 4px rgba(255,255,255,0.5);
    }
    .podium-medal {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 48px;
      height: 48px;
      opacity: 0.95;
      z-index: 20;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    }
    .meilleur-joueur-badge {
      position: absolute;
      top: -12px;
      left: -12px;
      padding: 4px 10px;
      border-radius: 9999px;
      background: #fef3c7;
      color: #92400e;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid #fcd34d;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      z-index: 30;
      white-space: nowrap;
    }
    .podium-content {
      text-align: center;
      position: relative;
      z-index: 10;
      padding-top: 20px;
    }
    .podium-name {
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.025em;
      text-align: center;
      line-height: 1.2;
      margin-bottom: 24px;
      border: none;
      background: transparent;
      padding: 0;
    }
    .podium-2 .podium-name {
      font-size: 18px;
    }
    .podium-1 .podium-name {
      font-size: 20px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .podium-3 .podium-name {
      font-size: 16px;
    }
    .podium-points-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 16px;
    }
    .podium-points {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 9999px;
      background: rgba(255,255,255,0.95);
      backdrop-filter: blur(10px);
      border: 2px solid;
      font-weight: 800;
      color: #111827;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .podium-2 .podium-points {
      padding: 6px 16px;
      border-color: #71717a;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1), 0 0 0 2px rgba(212, 212, 216, 0.5);
      font-size: 18px;
    }
    .podium-1 .podium-points {
      padding: 8px 20px;
      border-color: #eab308;
      box-shadow: 0 4px 12px rgba(234, 179, 8, 0.35), 0 0 0 2px rgba(234, 179, 8, 0.5);
      font-size: 20px;
    }
    .podium-3 .podium-points {
      padding: 6px 16px;
      border-color: #f97316;
      box-shadow: 0 2px 8px rgba(249, 115, 22, 0.25), 0 0 0 2px rgba(251, 146, 60, 0.5);
      font-size: 18px;
    }
    .podium-points-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    .podium-2 .podium-points-label {
      color: #374151;
    }
    .podium-1 .podium-points-label {
      color: #111827;
    }
    .podium-3 .podium-points-label {
      color: #374151;
    }
    
    /* Leaderboard section */
    .leaderboard-section {
      margin-top: 32px;
    }
    .leaderboard-header {
      padding: 0 20px 16px;
    }
    .leaderboard-title-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .leaderboard-title-wrapper::before,
    .leaderboard-title-wrapper::after {
      content: '';
      height: 1px;
      flex: 1;
      max-width: 96px;
      background: rgba(255,255,255,0.2);
    }
    .leaderboard-title {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.1);
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .table-wrapper {
      border-radius: 24px;
      overflow: hidden;
      border: 4px solid #cbd5e1;
      background: #fff;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
    }
    thead {
      background: #f1f5f9;
    }
    th {
      padding: 12px 16px;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      border-left: 1px solid #e2e8f0;
    }
    th:first-child {
      border-left: none;
    }
    tbody tr {
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
    }
    tbody tr:last-child {
      border-bottom: none;
    }
    td {
      padding: 12px 16px;
      text-align: center;
      font-size: 14px;
      color: #1e293b;
      border-left: 1px solid #e2e8f0;
    }
    td:first-child {
      border-left: none;
    }
    .player-name {
      font-weight: 600;
      color: #1e293b;
    }
    
    /* Rank badges - larger and sharper for PDF */
    .rank-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-weight: 800;
      font-size: 14px;
      border: 2px solid;
      position: relative;
      overflow: visible;
      text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .rank-1 { 
      background: linear-gradient(135deg, #fbbf24, #f59e0b, #d97706); 
      border-color: rgba(234, 179, 8, 0.5); 
      color: #fff;
      box-shadow: 0 0 20px rgba(234,179,8,0.5), 0 2px 12px rgba(234,179,8,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset;
    }
    .rank-1::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4), transparent 50%);
      opacity: 0.5;
    }
    .rank-1::after {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.4);
    }
    .rank-2 { 
      background: linear-gradient(135deg, #d1d5db, #9ca3af, #6b7280); 
      border-color: rgba(156, 163, 175, 0.5); 
      color: #fff;
      box-shadow: 0 0 15px rgba(156,163,175,0.4), 0 2px 12px rgba(156,163,175,0.4), 0 0 0 1px rgba(255,255,255,0.15) inset;
    }
    .rank-2::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3), transparent 50%);
      opacity: 0.5;
    }
    .rank-2::after {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.4);
    }
    .rank-3 { 
      background: linear-gradient(135deg, #fb923c, #f97316, #ea580c); 
      border-color: rgba(249, 115, 22, 0.5); 
      color: #fff;
      box-shadow: 0 0 15px rgba(249,115,22,0.4), 0 2px 12px rgba(249,115,22,0.4), 0 0 0 1px rgba(255,255,255,0.15) inset;
    }
    .rank-3::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.25), transparent 50%);
      opacity: 0.5;
    }
    .rank-3::after {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.4);
    }
    .rank-default { 
      background: linear-gradient(135deg, #1A3A6E, #1E4280, #1A3A6E); 
      border-color: rgba(59, 130, 246, 0.5); 
      color: #fff;
      box-shadow: 0 0 15px rgba(26,58,110,0.7), 0 2px 12px rgba(26,58,110,0.7), 0 0 0 1px rgba(255,255,255,0.15) inset;
    }
    .rank-default::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 20%, rgba(0,102,255,0.2), transparent 50%);
      opacity: 0.5;
    }
    .rank-default::after {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.4);
    }
    .rank-badge span {
      position: relative;
      z-index: 10;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    
    /* Tier badges - larger and sharper for PDF */
    .tier-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      border: 2px solid;
      position: relative;
      overflow: visible;
      text-shadow: 0 1px 2px rgba(0,0,0,0.9);
      letter-spacing: 0.05em;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .tier-Bronze { 
      background: linear-gradient(135deg, #fb923c, #f97316, #ea580c); 
      border-color: rgba(249, 115, 22, 0.5); 
      box-shadow: 0 0 15px rgba(249,115,22,0.4), 0 2px 12px rgba(249,115,22,0.4), 0 0 0 1px rgba(255,255,255,0.15) inset;
    }
    .tier-Bronze::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.2), transparent 50%);
      opacity: 0.5;
    }
    .tier-Bronze::after {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 9999px;
      border: 1px solid rgba(255,255,255,0.4);
    }
    .tier-Argent { 
      background: linear-gradient(135deg, #d1d5db, #9ca3af, #6b7280); 
      border-color: rgba(156, 163, 175, 0.5); 
      color: #ffffff;
      box-shadow: 0 0 15px rgba(156,163,175,0.4), 0 2px 12px rgba(156,163,175,0.4), 0 0 0 1px rgba(255,255,255,0.15) inset;
    }
    .tier-Argent::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3), transparent 50%);
      opacity: 0.5;
    }
    .tier-Argent::after {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 9999px;
      border: 1px solid rgba(255,255,255,0.4);
    }
    .tier-Or { 
      background: linear-gradient(135deg, #fbbf24, #f59e0b, #d97706); 
      border-color: rgba(234, 179, 8, 0.5); 
      color: #ffffff;
      box-shadow: 0 0 20px rgba(234,179,8,0.5), 0 2px 12px rgba(234,179,8,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset;
    }
    .tier-Or::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4), transparent 50%);
      opacity: 0.5;
    }
    .tier-Or::after {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 9999px;
      border: 1px solid rgba(255,255,255,0.4);
    }
    .tier-Diamant { 
      background: linear-gradient(135deg, #22d3ee, #3b82f6, #22d3ee); 
      border-color: rgba(34, 211, 238, 0.5); 
      color: #ffffff;
      box-shadow: 0 0 25px rgba(34,211,238,0.6), 0 2px 12px rgba(34,211,238,0.6), 0 0 0 1px rgba(255,255,255,0.15) inset;
    }
    .tier-Diamant::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.45), transparent 50%);
      opacity: 0.5;
    }
    .tier-Diamant::after {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 9999px;
      border: 1px solid rgba(255,255,255,0.4);
    }
    .tier-Champion { 
      background: linear-gradient(135deg, #a855f7, #ec4899, #a855f7); 
      border-color: rgba(168, 85, 247, 0.5); 
      color: #ffffff;
      box-shadow: 0 0 30px rgba(168,85,247,0.7), 0 2px 12px rgba(168,85,247,0.7), 0 0 0 1px rgba(255,255,255,0.15) inset;
    }
    .tier-Champion::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5), transparent 50%);
      opacity: 0.5;
    }
    .tier-Champion::after {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 9999px;
      border: 1px solid rgba(255,255,255,0.4);
    }
    .tier-badge span {
      position: relative;
      z-index: 10;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    
    .winrate {
      color: #059669;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .wins {
      color: #047857;
      background: #ecfdf5;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .losses {
      color: #b91c1c;
      background: #fef2f2;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .points {
      font-weight: 600;
      color: #0f172a;
      font-variant-numeric: tabular-nums;
    }
    .matches {
      font-weight: 600;
      color: #334155;
      font-variant-numeric: tabular-nums;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Classement</h1>
      <div class="stats">
        <span class="stat-badge">👥 ${totalPlayers} joueur${totalPlayers > 1 ? 's' : ''}</span>
        <span class="stat-badge">📊 ${totalMatches} match${totalMatches > 1 ? 's' : ''} comptabilisé${totalMatches > 1 ? 's' : ''}</span>
      </div>
    </div>

    ${top3.length > 0 ? `
    <div class="top3-section">
      <div class="top3-title-wrapper">
        <div class="top3-title">Top joueurs du moment</div>
      </div>
      <div class="top3-container">
        ${top3[1] ? `
        <div class="podium-card podium-2">
          <img src="${medal2Src}" alt="Médaille 2ème place" class="podium-medal" />
          <div class="podium-content">
            <h3 class="podium-name podium-2">${top3[1].player_name}</h3>
            <div class="podium-points-wrapper">
              <div class="podium-points podium-2">
                <span>${top3[1].points.toLocaleString()}</span>
                <span class="podium-points-label">points</span>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
        ${top3[0] ? `
        <div class="podium-card podium-1">
          <div class="meilleur-joueur-badge">Meilleur joueur</div>
          <img src="${medal1Src}" alt="Médaille 1ère place" class="podium-medal" />
          <div class="podium-content">
            <h3 class="podium-name podium-1">${top3[0].player_name}</h3>
            <div class="podium-points-wrapper">
              <div class="podium-points podium-1">
                <span>${top3[0].points.toLocaleString()}</span>
                <span class="podium-points-label">points</span>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
        ${top3[2] ? `
        <div class="podium-card podium-3">
          <img src="${medal3Src}" alt="Médaille 3ème place" class="podium-medal" />
          <div class="podium-content">
            <h3 class="podium-name podium-3">${top3[2].player_name}</h3>
            <div class="podium-points-wrapper">
              <div class="podium-points podium-3">
                <span>${top3[2].points.toLocaleString()}</span>
                <span class="podium-points-label">points</span>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    <div class="leaderboard-section">
      <div class="leaderboard-header">
        <div class="leaderboard-title-wrapper">
          <div class="leaderboard-title">Classement global</div>
        </div>
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
              <td><span class="rank-badge ${rankClass}"><span>#${player.rank}</span></span></td>
              <td><span class="player-name">${player.player_name}</span></td>
              <td><span class="tier-badge tier-${tier}"><span>${tier}</span></span></td>
              <td class="points">${player.points}</td>
              <td class="winrate">${winRate}%</td>
              <td class="wins">${player.wins}</td>
              <td class="losses">${player.losses}</td>
              <td class="matches">${player.matches}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // Configuration pour Vercel (serverless) vs local
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    if (isVercel) {
      // Sur Vercel, utiliser @sparticuz/chromium
      chromium.setGraphicsMode(false);
      logger.info({}, '[export-leaderboard-pdf] Using @sparticuz/chromium for Vercel');
      browser = await puppeteer.launch({
        args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      // En local, utiliser le Chrome/Chromium installé
      logger.info({}, '[export-leaderboard-pdf] Using local Chrome/Chromium');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
      scale: 1.0,
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
    logger.error({ error: error?.message || String(error), stack: error?.stack }, '[export-leaderboard-pdf] Unexpected error');
    return NextResponse.json(
      { error: error?.message || 'Erreur serveur inattendue' },
      { status: 500 }
    );
  }
}
