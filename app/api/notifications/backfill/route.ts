import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getBadges, type PlayerStats } from "@/lib/badges";
import { createNotification } from "@/lib/notifications";
import { filterMatchesByDailyLimit } from "@/lib/utils/match-limit-utils";
import { MAX_MATCHES_PER_DAY } from "@/lib/match-constants";
import { calculatePointsWithBoosts } from "@/lib/utils/boost-points-utils";
import { logger } from "@/lib/logger";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Fonction pour calculer le tier à partir des points (même logique que dans Leaderboard.tsx)
function tierForPoints(points: number): string {
  if (points >= 500) return "Champion";
  if (points >= 300) return "Diamant";
  if (points >= 200) return "Or";
  if (points >= 100) return "Argent";
  return "Bronze";
}

// Fonction pour calculer le streak
async function calculateStreak(userId: string, clubId: string | null): Promise<number> {
  // Récupérer tous les matchs du joueur
  const { data: mp } = await supabaseAdmin
    .from("match_participants")
    .select("match_id, team")
    .eq("user_id", userId)
    .eq("player_type", "user");

  if (!mp || mp.length === 0) return 0;

  // Filtrer par club si nécessaire
  let validMatchIds = mp.map((p: any) => p.match_id);
  if (clubId) {
    const { data: allParticipants } = await supabaseAdmin
      .from("match_participants")
      .select("match_id, user_id, player_type")
      .in("match_id", validMatchIds)
      .eq("player_type", "user");

    if (allParticipants) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, club_id")
        .in("id", Array.from(new Set(allParticipants.map((p: any) => p.user_id))));

      const clubUserIds = new Set(
        profiles?.filter((p: any) => p.club_id === clubId).map((p: any) => p.id) || []
      );

      const validMatches = new Set(
        allParticipants
          .filter((p: any) => clubUserIds.has(p.user_id))
          .map((p: any) => p.match_id)
      );

      validMatchIds = validMatchIds.filter((id) => validMatches.has(id));
    }
  }

  // Récupérer les matchs
  const { data: matches } = await supabaseAdmin
    .from("matches")
    .select("id, winner_team, created_at")
    .in("id", validMatchIds)
    .order("created_at", { ascending: false });

  if (!matches || matches.length === 0) return 0;

  const winnerByMatch: Record<string, number> = {};
  matches.forEach((m: any) => {
    winnerByMatch[m.id] = m.winner_team;
  });

  // Trier par date
  const mpSorted = mp
    .filter((p: any) => winnerByMatch[p.match_id] !== undefined)
    .sort((a: any, b: any) => {
      const aDate = matches.find((m: any) => m.id === a.match_id)?.created_at || "";
      const bDate = matches.find((m: any) => m.id === b.match_id)?.created_at || "";
      return bDate.localeCompare(aDate);
    });

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
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info(`[Backfill] Début du backfill pour l'utilisateur ${user.id.substring(0, 8)}…`);

    // Récupérer le profil de l'utilisateur
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("club_id, points")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const clubId = profile.club_id;
    const userPoints = typeof profile.points === "number" ? profile.points : parseInt(profile.points || "0", 10) || 0;

    // Vérifier quelles notifications existent déjà
    const { data: existingNotifications } = await supabaseAdmin
      .from("notifications")
      .select("type, data")
      .eq("user_id", user.id);

    const existingBadgeKeys = new Set<string>();
    const existingTiers = new Set<string>();

    existingNotifications?.forEach((n: any) => {
      try {
        if (n.type === "badge_unlocked" || n.type === "badge") {
          const data = typeof n.data === "string" ? JSON.parse(n.data) : n.data;
          const key = `${data?.badge_icon || ""}|${data?.badge_name || ""}`;
          if (key !== "|") existingBadgeKeys.add(key);
        } else if (n.type === "level_up") {
          const data = typeof n.data === "string" ? JSON.parse(n.data) : n.data;
          const tier = data?.tier || data?.tier_name;
          if (tier) existingTiers.add(tier);
        }
      } catch (parseError) {
        // Skip malformed notification data silently
        logger.warn(`[Backfill] Malformed notification data skipped: ${n.id}`);
      }
    });

    logger.info(`[Backfill] Notifications existantes: ${existingNotifications?.length || 0}`);
    logger.info(`[Backfill] Badges existants: ${existingBadgeKeys.size}`);
    logger.info(`[Backfill] Tiers existants: ${existingTiers.size}`);

    // Calculer les stats du joueur pour les badges
    const { data: mp } = await supabaseAdmin
      .from("match_participants")
      .select("match_id, team")
      .eq("user_id", user.id)
      .eq("player_type", "user");

    if (!mp || mp.length === 0) {
      return NextResponse.json({
        message: "Aucun match trouvé",
        created: { badges: 0, tiers: 0 }
      });
    }

    // Filtrer par club
    let validMatchIds = mp.map((p: any) => p.match_id);
    if (clubId) {
      const { data: allParticipants } = await supabaseAdmin
        .from("match_participants")
        .select("match_id, user_id, player_type")
        .in("match_id", validMatchIds)
        .eq("player_type", "user");

      if (allParticipants) {
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, club_id")
          .in("id", Array.from(new Set(allParticipants.map((p: any) => p.user_id))));

        const clubUserIds = new Set(
          profiles?.filter((p: any) => p.club_id === clubId).map((p: any) => p.id) || []
        );

        const validMatches = new Set(
          allParticipants
            .filter((p: any) => clubUserIds.has(p.user_id))
            .map((p: any) => p.match_id)
        );

        validMatchIds = validMatchIds.filter((id) => validMatches.has(id));
      }
    }

    // Récupérer les matchs
    const { data: matches } = await supabaseAdmin
      .from("matches")
      .select("id, winner_team, created_at, played_at")
      .in("id", validMatchIds);

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        message: "Aucun match valide trouvé",
        created: { badges: 0, tiers: 0 }
      });
    }

    // Calculer les stats
    const byId: Record<string, any> = {};
    matches.forEach((m: any) => {
      byId[m.id] = {
        winner_team: m.winner_team,
        created_at: m.created_at || m.played_at,
      };
    });

    // Filtrer selon la limite quotidienne
    const validMatchIdsForPoints = filterMatchesByDailyLimit(
      validMatchIds,
      matches.map((m: any) => ({
        id: m.id,
        played_at: m.created_at || m.played_at || new Date().toISOString(),
      })),
      MAX_MATCHES_PER_DAY
    );

    let wins = 0;
    let losses = 0;
    let matchCount = 0;
    const winMatches = new Set<string>();

    mp
      .filter((p: any) => validMatchIdsForPoints.has(p.match_id) && byId[p.match_id])
      .forEach((p: any) => {
        matchCount += 1;
        const won = byId[p.match_id].winner_team === p.team;
        if (won) {
          wins += 1;
          winMatches.add(p.match_id);
        } else {
          losses += 1;
        }
      });

    // Calculer les points avec boosts
    // Note: calculatePointsWithBoosts prend (wins, losses, matchIds, winMatches, userId, reviewsBonus, challengePoints)
    // Pour simplifier, on calcule les points de base ici
    const basePoints = wins * 10 + losses * 3;

    // Ajouter le bonus review si applicable
    const { data: reviews } = await supabaseAdmin
      .from("reviews")
      .select("rating, comment")
      .eq("user_id", user.id)
      .limit(1);

    let reviewsBonus = 0;
    if (reviews && reviews.length > 0) {
      const { isReviewValidForBonus } = await import("@/lib/utils/review-utils");
      if (isReviewValidForBonus(reviews[0].rating || 0, reviews[0].comment || null)) {
        reviewsBonus = 10;
      }
    }

    // Récupérer les points de challenge
    const challengePoints = typeof profile.points === "number"
      ? profile.points
      : (typeof profile.points === "string" ? parseInt(profile.points || "0", 10) : 0);

    // Calculer les points avec boosts (simplifié pour le backfill)
    const points = await calculatePointsWithBoosts(
      wins,
      losses,
      validMatchIds,
      winMatches,
      user.id,
      reviewsBonus,
      challengePoints
    );

    // Calculer le streak
    const streak = await calculateStreak(user.id, clubId);

    // Calculer les badges
    const stats: PlayerStats = {
      wins,
      losses,
      matches: matchCount,
      points,
      streak,
    };

    const badges = getBadges(stats);
    logger.info(`[Backfill] Badges calculés: ${badges.length}`);

    // Créer les notifications pour les badges manquants
    let badgesCreated = 0;
    for (const badge of badges) {
      const key = `${badge.icon}|${badge.title}`;
      if (!existingBadgeKeys.has(key)) {
        await createNotification(user.id, "badge_unlocked", {
          badge_name: badge.title,
          badge_icon: badge.icon,
          badge_description: badge.description,
          timestamp: new Date().toISOString(),
        });
        badgesCreated += 1;
        existingBadgeKeys.add(key); // Éviter les doublons dans cette session
      }
    }

    // Calculer le tier actuel
    const currentTier = tierForPoints(points);
    logger.info(`[Backfill] Tier actuel: ${currentTier}`);

    // Créer les notifications pour les tiers manquants (du plus bas au plus haut)
    const allTiers = ["Bronze", "Argent", "Or", "Diamant", "Champion"];
    const currentTierIndex = allTiers.indexOf(currentTier);
    let tiersCreated = 0;

    for (let i = 0; i <= currentTierIndex; i++) {
      const tier = allTiers[i];
      if (!existingTiers.has(tier)) {
        const previousTier = i > 0 ? allTiers[i - 1] : null;
        await createNotification(user.id, "level_up", {
          tier,
          tier_name: tier,
          previous_tier: previousTier || "",
          timestamp: new Date().toISOString(),
        });
        tiersCreated += 1;
        existingTiers.add(tier); // Éviter les doublons dans cette session
      }
    }

    logger.info(`[Backfill] Terminé: ${badgesCreated} badges, ${tiersCreated} tiers créés`);

    return NextResponse.json({
      message: "Backfill terminé avec succès",
      created: {
        badges: badgesCreated,
        tiers: tiersCreated,
      },
      stats: {
        badges: badges.length,
        currentTier,
        points,
        wins,
        losses,
        matches: matchCount,
        streak,
      },
    });
  } catch (error) {
    logger.error("[Backfill] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors du backfill", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
