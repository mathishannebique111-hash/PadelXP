import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getBadges, ALL_BADGES, type PlayerStats } from "@/lib/badges";
import BadgesUnlockNotifier from "./BadgesUnlockNotifier";
import LevelUpNotifier from "./LevelUpNotifier";
import TierBadge from "./TierBadge";
import BadgeIconDisplay from "./BadgeIconDisplay";
import { Flame } from "lucide-react";
import { filterMatchesByDailyLimit } from "@/lib/utils/match-limit-utils";
import { MAX_MATCHES_PER_DAY } from "@/lib/match-constants";
import { calculatePointsWithBoosts } from "@/lib/utils/boost-points-utils";
import { logger } from '@/lib/logger';

// Créer un client admin pour bypass RLS dans les requêtes critiques
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function PlayerSummary({ profileId }: { profileId: string }) {
  const supabase = await createClient();

  // 1. Charger tout ce qui est indépendant en parallèle (Admin pour bypass RLS sur données critiques)
  const [playerProfileResult, matchParticipantsResult, reviewsResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("club_id, points")
      .eq("id", profileId)
      .maybeSingle(),
    supabase
      .from("match_participants")
      .select("match_id, team")
      .eq("user_id", profileId)
      .eq("player_type", "user"),
    supabase
      .from("reviews")
      .select("rating, comment")
      .eq("user_id", profileId)
  ]);

  const playerProfile = playerProfileResult.data;
  const playerClubId = playerProfile?.club_id || null;
  const challengePoints = typeof playerProfile?.points === 'number'
    ? playerProfile.points
    : (typeof playerProfile?.points === 'string' ? parseInt(playerProfile.points, 10) || 0 : 0);

  const mp = matchParticipantsResult.data;
  const myReviews = reviewsResult.data;

  logger.info(`[PlayerSummary] Player ${profileId.substring(0, 8)} - Challenge points from DB`, { challengePoints, type: typeof challengePoints });
  logger.info(`[PlayerSummary] Player profile data`, { playerProfile });

  // Initialisation des variables de stats
  let wins = 0;
  let losses = 0;
  let setsWon = 0;
  let setsLost = 0;
  let matches = 0;
  let streak = 0;
  let currentWinStreak = 0;
  let winMatches = new Set<string>();
  let filteredMp: any[] = [];

  // Stats pour les badges (peuvent différer si un club est présent)
  let badgeWins = 0;
  let badgeLosses = 0;
  let badgeMatches = 0;
  let badgePoints = 0;
  let badgeStreak = 0;

  if (mp && mp.length) {
    const matchIds = mp.map((m: any) => m.match_id);
    logger.info(`[PlayerSummary] Fetching matches for player ${profileId}`, { matchIdsCount: matchIds.length });

    // 2. Charger TOUS les matchs en UNE SEULE requête pour éviter les waterfalls (streak/badges/points)
    const { data: allMs, error: allMsError } = await supabase
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id, score_team1, score_team2, played_at, created_at")
      .in("id", matchIds)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false }); // Order by created_at for consistent streak calculation

    if (allMsError) {
      logger.error("[PlayerSummary] Error fetching matches:", allMsError);
    }

    if (allMs && allMs.length) {
      const byId: Record<string, any> = {};
      allMs.forEach((m: any) => {
        if (!m.winner_team_id || !m.team1_id || !m.team2_id) {
          logger.warn("[PlayerSummary] Skipping match without winner_team_id:", m.id);
          return;
        }
        byId[m.id] = {
          winner_team: m.winner_team_id === m.team1_id ? 1 : 2,
          score_team1: m.score_team1 || 0,
          score_team2: m.score_team2 || 0,
          created_at: m.created_at || m.played_at // Use played_at as fallback for created_at
        };
      });

      // Logic for Points & Winrate (with daily limit)
      const validMatchIdsForPoints = filterMatchesByDailyLimit(
        mp.map((p: any) => ({ match_id: p.match_id, user_id: profileId })),
        allMs.map((m: any) => ({ id: m.id, played_at: m.played_at || m.created_at })),
        MAX_MATCHES_PER_DAY
      );
      logger.info("[PlayerSummary] Valid matches after daily limit:", validMatchIdsForPoints.size);

      // CALCUL STATS GLOBALES (Points, Winrate, Sets)
      filteredMp = mp.filter((p: any) => validMatchIdsForPoints.has(p.match_id) && byId[p.match_id]);
      logger.info("[PlayerSummary] Filtered matches count for points:", filteredMp.length);

      filteredMp.forEach((p: any) => {
        const match = byId[p.match_id];
        matches += 1;
        const won = match.winner_team === p.team;
        if (won) {
          wins += 1;
          winMatches.add(p.match_id);
        } else {
          losses += 1;
        }

        if (p.team === 1) {
          setsWon += match.score_team1;
          setsLost += match.score_team2;
        } else {
          setsWon += match.score_team2;
          setsLost += match.score_team1;
        }
      });
      logger.info("[PlayerSummary] Player stats calculated", { matches, wins, losses, setsWon, setsLost });

      // CALCUL STREAKS (basé sur validMatchIdsForPoints)
      const matchesSortedAsc = [...filteredMp].sort((a: any, b: any) => {
        const aCreatedAt = byId[a.match_id].created_at || "";
        const bCreatedAt = byId[b.match_id].created_at || "";
        return aCreatedAt.localeCompare(bCreatedAt);
      });
      let rollingStreak = 0;
      for (const p of matchesSortedAsc) {
        if (byId[p.match_id].winner_team === p.team) {
          rollingStreak++;
          if (rollingStreak > streak) streak = rollingStreak;
        } else {
          rollingStreak = 0;
        }
      }

      currentWinStreak = 0;
      const matchesSortedDesc = [...filteredMp].sort((a: any, b: any) => {
        const aCreatedAt = byId[a.match_id].created_at || "";
        const bCreatedAt = byId[b.match_id].created_at || "";
        return bCreatedAt.localeCompare(aCreatedAt);
      });
      for (const p of matchesSortedDesc) {
        if (byId[p.match_id].winner_team === p.team) {
          currentWinStreak++;
        } else {
          break;
        }
      }
      logger.info("[PlayerSummary] Streak calculated", { best: streak, current: currentWinStreak });


      // CALCUL BADGES (sans limite quotidienne, potentiellement filtré par club)
      let validMatchIdsForBadges = matchIds;
      if (playerClubId) {
        // Pour les badges, on garde le filtrage club strict
        const { data: allParticipants } = await supabase
          .from("match_participants")
          .select("match_id, user_id, player_type")
          .in("match_id", matchIds)
          .eq("player_type", "user");

        const participantUserIds = [...new Set((allParticipants || []).map((p: any) => p.user_id).filter(Boolean))];
        const { data: clubProfiles } = await supabaseAdmin
          .from("profiles")
          .select("id, club_id")
          .in("id", participantUserIds)
          .eq("club_id", playerClubId);

        const validUserIdsForClub = new Set((clubProfiles || []).map((p: any) => p.id));
        validMatchIdsForBadges = matchIds.filter((matchId: string) => {
          const participants = (allParticipants || []).filter((p: any) => p.match_id === matchId);
          return participants.every((p: any) => p.player_type === "guest" || validUserIdsForClub.has(p.user_id));
        });
      }

      const filteredMpForBadges = mp.filter((p: any) => validMatchIdsForBadges.includes(p.match_id) && byId[p.match_id]);
      filteredMpForBadges.forEach((p: any) => {
        if (byId[p.match_id].winner_team === p.team) badgeWins++;
        else badgeLosses++;
      });
      badgeMatches = filteredMpForBadges.length;
      badgePoints = badgeWins * 10 + badgeLosses * 3;

      // Badge Streak
      const mpBadgeSorted = [...filteredMpForBadges].sort((a: any, b: any) => {
        const aCreatedAt = byId[a.match_id].created_at || "";
        const bCreatedAt = byId[b.match_id].created_at || "";
        return bCreatedAt.localeCompare(aCreatedAt);
      });
      let curBadgeStreak = 0;
      let bestBadgeStreak = 0;
      for (const p of [...mpBadgeSorted].reverse()) { // Process in ascending order for best streak
        if (byId[p.match_id].winner_team === p.team) {
          curBadgeStreak++;
          if (curBadgeStreak > bestBadgeStreak) bestBadgeStreak = curBadgeStreak;
        } else {
          curBadgeStreak = 0;
        }
      }
      badgeStreak = bestBadgeStreak;
    }
  }

  // Calcul bonus avis
  let reviewsBonus = 0;
  if (myReviews && myReviews.length > 0) {
    const { isReviewValidForBonus } = await import("@/lib/utils/review-utils");
    if (myReviews.some((r: any) => isReviewValidForBonus(r.rating || 0, r.comment || null))) {
      reviewsBonus = 10;
    }
  }

  logger.info("[PlayerSummary] Before calculatePointsWithBoosts:", {
    wins,
    losses,
    reviewsBonus,
    challengePoints,
    winMatchesCount: winMatches.size,
    filteredMatchesCount: filteredMp.length,
    winMatchIds: Array.from(winMatches).map(id => id.substring(0, 8))
  });

  // Calcul final des points
  const points = await calculatePointsWithBoosts(
    wins,
    losses,
    filteredMp.map((p: any) => p.match_id),
    winMatches,
    profileId,
    reviewsBonus,
    challengePoints
  );

  logger.info("[PlayerSummary] After calculatePointsWithBoosts - Final points:", points);

  function tierForPoints(p: number) {
    if (p >= 500) return { label: "Champion", className: "bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white" };
    if (p >= 300) return { label: "Diamant", className: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white" };
    if (p >= 200) return { label: "Or", className: "bg-gradient-to-r from-amber-400 to-yellow-500 text-white" };
    if (p >= 100) return { label: "Argent", className: "bg-gradient-to-r from-zinc-300 to-zinc-400 text-zinc-800" };
    return { label: "Bronze", className: "bg-gradient-to-r from-orange-400 to-orange-600 text-white" };
  }
  const tier = tierForPoints(points);

  // IMPORTANT: Calculer les stats pour les badges EXACTEMENT comme dans la page badges
  // (sans limite quotidienne, points simples wins*10 + losses*3)
  // Cela garantit que le nombre de badges affiché correspond à celui de la page badges
  // These are already calculated in the `if (mp && mp.length)` block as badgeWins, badgeLosses, etc.

  // Calcul des badges dynamiques basés sur les stats (EXACTEMENT comme la page badges)
  const statsForBadges: PlayerStats = { wins: badgeWins, losses: badgeLosses, matches: badgeMatches, points: badgePoints, streak: badgeStreak };
  let computedBadges = getBadges(statsForBadges);
  // Utiliser icon + title comme clé unique car plusieurs badges peuvent avoir la même icône
  const obtainedBadgeKeys = new Set(computedBadges.map(b => `${b.icon}|${b.title}`));

  // Badges liés aux avis: Contributeur (premier avis valide du joueur)
  // Un avis est valide si rating > 3 OU (rating <= 3 ET words > 6)
  // myReviews is already fetched at the beginning

  // Ajouter les badges d'avis au Set (évite les doublons)
  const extraObtained = new Set<string>();
  if (myReviews && myReviews.length > 0) {
    // Vérifier si au moins un avis est valide
    const { isReviewValidForBonus } = await import("@/lib/utils/review-utils");
    const hasValidReviewForBadge = myReviews.some((r: any) =>
      isReviewValidForBonus(r.rating || 0, r.comment || null)
    );

    if (hasValidReviewForBadge) {
      extraObtained.add("💬|Contributeur"); // Contributeur: au moins 1 avis valide
      // Ajouter le badge Contributeur à computedBadges pour BadgesUnlockNotifier
      computedBadges = [...computedBadges, ALL_BADGES.find(b => b.title === "Contributeur")!].filter(Boolean);
    }
  }

  // Créer la liste avec le statut de chaque badge (même logique que la page badges)
  const badgesWithStatus = ALL_BADGES.map((badge) => ({
    ...badge,
    obtained: obtainedBadgeKeys.has(`${badge.icon}|${badge.title}`) || extraObtained.has(`${badge.icon}|${badge.title}`),
  }));

  // Calcul du winrate (utiliser les stats avec limite quotidienne pour l'affichage)
  const winrate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
  const winrateColor = winrate > 60 ? "#10B981" : winrate >= 40 ? "#0066FF" : "#EF4444";

  // Nombre total de badges standards
  const totalBadges = ALL_BADGES.length;
  // Nombre de badges standards obtenus (comptés de la même manière que dans la page badges)
  const badgesObtained = badgesWithStatus.filter((b) => b.obtained).length;

  return (
    <div className="w-full max-w-2xl rounded-xl sm:rounded-2xl border border-white/80 p-6 sm:p-8 md:p-10 text-white shadow-xl relative overflow-hidden" style={{
      background: "linear-gradient(135deg, rgba(8,30,78,0.88) 0%, rgba(4,16,46,0.92) 100%), radial-gradient(circle at 30% 20%, rgba(0,102,255,0.08), transparent 70%)"
    }}>
      <div>
        {/* Notifier client pour les changements de niveau */}
        <LevelUpNotifier tier={tier.label} />
        {/* Notifier client pour célébrer les nouveaux badges */}
        <BadgesUnlockNotifier obtained={computedBadges} />
        {/* Badge niveau en haut et visible */}
        <div className="mb-4 sm:mb-5 flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white truncate">Mes statistiques</h3>
          <TierBadge tier={tier.label as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="sm" />
        </div>

        {/* Série de victoires en cours - Cadre en longueur, séparé */}
        <div className="mb-3 sm:mb-4">
          <div
            className="rounded-lg border border-padel-green bg-gradient-to-br from-padel-green/10 via-black/40 to-black/20 px-3 sm:px-4 py-2 sm:py-2.5 animate-fadeInUp relative overflow-hidden text-white"
            style={{ animationDelay: "0ms" }}
          >

            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-padel-green font-medium mb-1">
                  Série de victoires en cours
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-black tabular-nums text-white">
                    {currentWinStreak}
                  </span>
                  <span className="text-[10px] sm:text-xs text-white/80 uppercase tracking-[0.1em]">
                    victoire{currentWinStreak >= 2 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 relative">
                {/* Icône flamme principale */}
                <div className="relative z-10">
                  <Flame size={32} className="text-white drop-shadow-[0_0_8px_rgba(204,255,0,0.6)]" strokeWidth={1.5} />
                </div>
                {/* Effet fantôme derrière */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 pointer-events-none">
                  <Flame size={64} className="text-padel-green/20 blur-[1px] transform scale-125" strokeWidth={3} />
                </div>

                <div className="text-[9px] sm:text-[10px] text-white/80 mt-1">
                  Meilleure : <span className="font-semibold tabular-nums text-padel-green">{streak}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid 2x4 compact pour les stats */}
        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:gap-7 text-xs sm:text-sm">
          {/* Points - Stat principale */}
          <div
            className="rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-3 sm:py-4 shadow-md sm:shadow-lg transition-shadow duration-300 hover:shadow-xl animate-fadeInUp"
            style={{ animationDelay: '50ms', borderLeftWidth: '4px', borderLeftColor: '#CCFF00' }}
          >
            <div className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.25em] text-[#172554]/70 mb-1.5 sm:mb-2 font-medium">Points</div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#172554] tabular-nums">
              {typeof points === 'number' ? points : (typeof points === 'string' ? parseInt(String(points), 10) || 0 : 0)}
            </div>
          </div>

          {/* Matchs - Stat principale */}
          <div
            className="rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-3 sm:py-4 shadow-md sm:shadow-lg transition-shadow duration-300 hover:shadow-xl animate-fadeInUp"
            style={{ animationDelay: '50ms', borderLeftWidth: '4px', borderLeftColor: '#CCFF00' }}
          >
            <div className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.25em] text-[#172554]/70 mb-1.5 sm:mb-2 font-medium">Matchs</div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#172554] tabular-nums">{matches}</div>
          </div>

          {/* Victoires - Stat principale */}
          <div
            className="rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-3 sm:py-4 shadow-md sm:shadow-lg transition-shadow duration-300 hover:shadow-xl animate-fadeInUp"
            style={{ animationDelay: '100ms', borderLeftWidth: '4px', borderLeftColor: '#CCFF00' }}
          >
            <div className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.25em] text-[#172554]/70 mb-1.5 sm:mb-2 font-medium">Victoires</div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#172554] tabular-nums">{wins}</div>
          </div>

          {/* Défaites - Stat principale */}
          <div
            className="rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-3 sm:py-4 shadow-md sm:shadow-lg transition-shadow duration-300 hover:shadow-xl animate-fadeInUp"
            style={{ animationDelay: '150ms', borderLeftWidth: '4px', borderLeftColor: '#CCFF00' }}
          >
            <div className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.25em] text-[#172554]/70 mb-1.5 sm:mb-2 font-medium">Défaites</div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#172554] tabular-nums">{losses}</div>
          </div>

          {/* Sets gagnés - Stat secondaire */}
          <div
            className="rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-3 sm:py-4 shadow-md sm:shadow-lg transition-shadow duration-300 hover:shadow-xl animate-fadeInUp"
            style={{ animationDelay: '200ms', borderLeftWidth: '4px', borderLeftColor: '#CCFF00' }}
          >
            <div className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.25em] text-[#172554]/70 mb-1.5 sm:mb-2 font-medium">Sets gagnés</div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#172554] tabular-nums">{setsWon}</div>
          </div>

          {/* Sets perdus - Stat secondaire */}
          <div
            className="rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-3 sm:py-4 shadow-md sm:shadow-lg transition-shadow duration-300 hover:shadow-xl animate-fadeInUp"
            style={{ animationDelay: '250ms', borderLeftWidth: '4px', borderLeftColor: '#CCFF00' }}
          >
            <div className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.25em] text-[#172554]/70 mb-1.5 sm:mb-2 font-medium">Sets perdus</div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#172554] tabular-nums">{setsLost}</div>
          </div>

          {/* Winrate - Stat secondaire avec dégradé */}
          <div
            className="rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-3 sm:py-4 shadow-md sm:shadow-lg transition-shadow duration-300 hover:shadow-xl animate-fadeInUp"
            style={{ animationDelay: '300ms', borderLeftWidth: '4px', borderLeftColor: '#CCFF00' }}
          >
            <div className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.25em] text-[#172554]/70 mb-1.5 sm:mb-2 font-medium">Winrate</div>
            <div
              className="text-2xl sm:text-3xl md:text-4xl font-bold tabular-nums"
              style={{
                background: winrate > 60
                  ? "linear-gradient(to right, #10B981, #059669)"
                  : winrate >= 40
                    ? "linear-gradient(to right, #0066FF, #0052CC)"
                    : "linear-gradient(to right, #EF4444, #DC2626)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              {winrate > 60 && <span className="inline-block mr-1">↗</span>}
              {winrate < 40 && <span className="inline-block mr-1">↘</span>}
              {winrate >= 40 && winrate <= 60 && <span className="inline-block mr-1">→</span>}
              {winrate}%
            </div>
          </div>

          {/* Badges - Stat secondaire */}
          <div
            className="rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-3 sm:py-4 shadow-md sm:shadow-lg transition-shadow duration-300 hover:shadow-xl animate-fadeInUp"
            style={{ animationDelay: '350ms', borderLeftWidth: '4px', borderLeftColor: '#CCFF00' }}
          >
            <div className="text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.25em] text-[#172554]/70 mb-1.5 sm:mb-2 font-medium">Badges</div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#172554] tabular-nums">{badgesObtained} / {totalBadges}</div>
          </div>
        </div>


      </div>
    </div>
  );
}
