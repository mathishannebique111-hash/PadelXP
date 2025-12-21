/**
 * Script de migration pour créer les notifications historiques pour tous les joueurs
 * 
 * Ce script analyse l'état actuel de tous les joueurs et crée des notifications pour :
 * - Leur niveau actuel (Bronze, Argent, Or, Diamant, Champion)
 * - Leurs badges débloqués
 * - Leur position dans le classement (Top 3)
 * 
 * Usage: node scripts/migrate-historical-notifications.ts
 * Ou via API: POST /api/admin/migrate-notifications
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  logger.error("❌ Variables d'environnement manquantes");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Fonction pour calculer le tier selon les points
function tierForPoints(points: number): string {
  if (points >= 500) return "Champion";
  if (points >= 300) return "Diamant";
  if (points >= 200) return "Or";
  if (points >= 100) return "Argent";
  return "Bronze";
}

// Fonction pour obtenir tous les badges d'un joueur
function getBadgesForPlayer(stats: {
  wins: number;
  losses: number;
  matches: number;
  points: number;
  streak: number;
}): Array<{ icon: string; title: string; description: string }> {
  const { wins, losses, matches, points, streak } = stats;
  const badges = [];

  const ALL_BADGES = [
    { icon: "🏆", title: "Première victoire", description: "Obtenez votre première victoire" },
    { icon: "🔥", title: "Série de 3", description: "Gagnez 3 matchs consécutifs" },
    { icon: "🔥", title: "Série de 5", description: "Gagnez 5 matchs consécutifs" },
    { icon: "🔥", title: "Série de 7", description: "Gagnez 7 matchs consécutifs" },
    { icon: "🔥", title: "Série de 10", description: "Gagnez 10 matchs consécutifs" },
    { icon: "🔥", title: "série de 15", description: "Gagnez 15 matchs consécutifs" },
    { icon: "🔥", title: "série de 20", description: "Gagnez 20 matchs consécutifs" },
    { icon: "🎖️", title: "Marathonien", description: "Jouez 50 matchs" },
    { icon: "🏅", title: "Centurion", description: "Jouez 100 matchs" },
    { icon: "💯", title: "Meilleur scoreur", description: "Obtenez 100+ points" },
    { icon: "💎", title: "Diamant", description: "Atteignez 500 points" },
    { icon: "📈", title: "En progression", description: "Ayez 5 victoires de plus que de défaites" },
    { icon: "🎯", title: "Précision", description: "Remportez 5 matchs sans en perdre aucun" },
    { icon: "🏆🏆🏆", title: "Légende", description: "Gagnez 200 matchs au total" },
    { icon: "🎾", title: "Amour du padel", description: "Jouez 200 matchs au total" },
  ];

  if (wins >= 1) badges.push(ALL_BADGES[0]);
  if (streak >= 3) badges.push(ALL_BADGES[1]);
  if (streak >= 5) badges.push(ALL_BADGES[2]);
  if (streak >= 7) badges.push(ALL_BADGES[3]);
  if (streak >= 10) badges.push(ALL_BADGES[4]);
  if (streak >= 15) badges.push(ALL_BADGES[5]);
  if (streak >= 20) badges.push(ALL_BADGES[6]);
  if (matches >= 50 && matches < 100) badges.push(ALL_BADGES[7]);
  if (matches >= 100) badges.push(ALL_BADGES[8]);
  if (points >= 100) badges.push(ALL_BADGES[9]);
  if (points >= 500) badges.push(ALL_BADGES[10]);
  if (wins - losses >= 5) badges.push(ALL_BADGES[11]);
  if (wins >= 5 && losses === 0) badges.push(ALL_BADGES[12]);
  if (wins >= 200) badges.push(ALL_BADGES[13]);
  if (matches >= 200) badges.push(ALL_BADGES[14]);

  return badges;
}

// Fonction pour calculer le streak actuel
async function calculateStreak(userId: string): Promise<number> {
  try {
    const { data: mp } = await supabase
      .from("match_participants")
      .select("match_id, team")
      .eq("user_id", userId)
      .eq("player_type", "user");

    if (!mp || mp.length === 0) return 0;

    const matchIds = [...new Set(mp.map((p: any) => p.match_id))];
    const { data: ms } = await supabase
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id, created_at")
      .in("id", matchIds);

    if (!ms || ms.length === 0) return 0;

    const winnerByMatch: Record<string, number> = {};
    ms.forEach((m: any) => {
      if (m.winner_team_id && m.team1_id && m.team2_id) {
        winnerByMatch[m.id] = m.winner_team_id === m.team1_id ? 1 : 2;
      }
    });

    const mpSorted = mp
      .map((p: any) => ({
        ...p,
        match_date: ms.find((m: any) => m.id === p.match_id)?.created_at || "",
      }))
      .sort((a: any, b: any) => b.match_date.localeCompare(a.match_date));

    let streak = 0;
    let bestStreak = 0;
    for (const p of mpSorted) {
      const winnerTeam = winnerByMatch[p.match_id];
      if (!winnerTeam) continue;
      if (winnerTeam === p.team) {
        streak += 1;
        if (streak > bestStreak) bestStreak = streak;
      } else {
        streak = 0;
      }
    }
    return bestStreak;
  } catch (error) {
    logger.error(`Erreur calcul streak pour ${userId}:`, error);
    return 0;
  }
}

async function migrateNotifications() {
  logger.info("🚀 Début de la migration des notifications historiques\n");

  try {
    // 1. Récupérer tous les clubs actifs
    const { data: clubs, error: clubsError } = await supabase
      .from("clubs")
      .select("id, name")
      .eq("status", "active");

    if (clubsError) {
      logger.error("❌ Erreur récupération clubs:", clubsError);
      return;
    }

    logger.info(`📊 ${clubs?.length || 0} clubs trouvés\n`);

    let totalNotificationsCreated = 0;
    let totalPlayersProcessed = 0;

    // 2. Pour chaque club, traiter les joueurs
    for (const club of clubs || []) {
      logger.info(`\n🏢 Traitement du club: ${club.name} (${club.id})`);

      // Récupérer tous les joueurs du club
      const { data: players, error: playersError } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name")
        .eq("club_id", club.id);

      if (playersError || !players || players.length === 0) {
        logger.info(`   ⚠️ Aucun joueur dans ce club`);
        continue;
      }

      logger.info(`   👥 ${players.length} joueurs trouvés`);

      // Récupérer les statistiques pour tous les joueurs du club via l'API leaderboard
      // Note: Pour simplifier, on va calculer directement ici
      
      // Récupérer tous les participants de matchs du club
      const playerIds = players.map((p) => p.id);
      const { data: allParticipants } = await supabase
        .from("match_participants")
        .select("user_id, match_id, team, player_type")
        .in("user_id", playerIds)
        .eq("player_type", "user");

      if (!allParticipants || allParticipants.length === 0) {
        logger.info(`   ⚠️ Aucun match pour ce club`);
        continue;
      }

      const matchIds = [...new Set(allParticipants.map((p: any) => p.match_id))];
      const { data: matches } = await supabase
        .from("matches")
        .select("id, winner_team_id, team1_id, team2_id, played_at, created_at")
        .in("id", matchIds);

      if (!matches) continue;

      const matchesMap = new Map();
      matches.forEach((m: any) => {
        if (m.winner_team_id && m.team1_id && m.team2_id) {
          matchesMap.set(m.id, {
            winner_team: m.winner_team_id === m.team1_id ? 1 : 2,
            played_at: m.played_at || m.created_at,
          });
        }
      });

      // Calculer les stats par joueur
      const statsByPlayer: Record<
        string,
        { wins: number; losses: number; matches: number; points: number }
      > = {};

      allParticipants.forEach((p: any) => {
        const match = matchesMap.get(p.match_id);
        if (!match) return;

        if (!statsByPlayer[p.user_id]) {
          statsByPlayer[p.user_id] = { wins: 0, losses: 0, matches: 0, points: 0 };
        }

        statsByPlayer[p.user_id].matches += 1;
        const won = match.winner_team === p.team;
        if (won) {
          statsByPlayer[p.user_id].wins += 1;
          statsByPlayer[p.user_id].points += 10;
        } else {
          statsByPlayer[p.user_id].losses += 1;
        }
      });

      // Créer le leaderboard pour déterminer les top 3
      const leaderboard = players
        .map((p) => ({
          user_id: p.id,
          player_name: p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
          ...statsByPlayer[p.id],
        }))
        .filter((p) => p.matches > 0)
        .sort((a, b) => b.points - a.points || b.wins - a.wins);

      // 3. Créer les notifications pour chaque joueur
      for (let i = 0; i < leaderboard.length; i++) {
        const player = leaderboard[i];
        const playerId = player.user_id;

        logger.info(
          `   👤 ${player.player_name} - ${player.points} pts, ${player.wins}V/${player.losses}D`
        );

        const notificationsToCreate = [];

        // A. Notification de niveau
        const tier = tierForPoints(player.points);
        if (tier && player.points > 0) {
          notificationsToCreate.push({
            user_id: playerId,
            type: "level_up",
            data: {
              tier,
              tier_name: tier,
              points: player.points,
              timestamp: new Date().toISOString(),
            },
            read: false,
            created_at: new Date().toISOString(),
          });
          logger.info(`      🎯 Niveau: ${tier}`);
        }

        // B. Notifications de badges
        const streak = await calculateStreak(playerId);
        const badges = getBadgesForPlayer({
          ...player,
          streak,
        });

        for (const badge of badges) {
          notificationsToCreate.push({
            user_id: playerId,
            type: "badge_unlocked",
            data: {
              badge_name: badge.title,
              badge_icon: badge.icon,
              badge_description: badge.description,
              timestamp: new Date().toISOString(),
            },
            read: false,
            created_at: new Date().toISOString(),
          });
        }
        logger.info(`      🏅 ${badges.length} badges`);

        // C. Notification de classement (Top 3)
        const rank = i + 1;
        if (rank <= 3) {
          notificationsToCreate.push({
            user_id: playerId,
            type: "top3_ranking",
            data: {
              type: "current_position",
              rank,
              total_players: leaderboard.length,
              timestamp: new Date().toISOString(),
            },
            read: false,
            created_at: new Date().toISOString(),
          });
          logger.info(`      🏆 Top 3 - Position #${rank}`);
        }

        // Insérer toutes les notifications en une seule requête
        if (notificationsToCreate.length > 0) {
          const { error: insertError } = await supabase
            .from("notifications")
            .insert(notificationsToCreate);

          if (insertError) {
            logger.error(`      ❌ Erreur insertion notifications:`, insertError.message);
          } else {
            totalNotificationsCreated += notificationsToCreate.length;
            logger.info(`      ✅ ${notificationsToCreate.length} notifications créées`);
          }
        }

        totalPlayersProcessed++;
      }
    }

    logger.info("\n\n✅ Migration terminée !");
    logger.info(`📊 Statistiques:`);
    logger.info(`   - Joueurs traités: ${totalPlayersProcessed}`);
    logger.info(`   - Notifications créées: ${totalNotificationsCreated}`);
  } catch (error) {
    logger.error("❌ Erreur globale:", error);
    throw error;
  }
}

// Exécution du script
if (require.main === module) {
  migrateNotifications()
    .then(() => {
      logger.info("\n🎉 Script terminé avec succès");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("\n💥 Erreur fatale:", error);
      process.exit(1);
    });
}

export { migrateNotifications };

