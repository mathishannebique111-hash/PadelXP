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

  // Récupérer le club_id ET les points de challenges du joueur (utiliser admin pour bypass RLS)
  const { data: playerProfile } = await supabaseAdmin
    .from("profiles")
    .select("club_id, points")
    .eq("id", profileId)
    .maybeSingle();

  const playerClubId = playerProfile?.club_id || null;
  // S'assurer que challengePoints est un nombre (peut être string, null, undefined dans la DB)
  const challengePoints = typeof playerProfile?.points === 'number'
    ? playerProfile.points
    : (typeof playerProfile?.points === 'string' ? parseInt(playerProfile.points, 10) || 0 : 0);

  logger.info(`[PlayerSummary] Player ${profileId.substring(0, 8)} - Challenge points from DB:`, challengePoints, `(type: ${typeof challengePoints})`);
  logger.info(`[PlayerSummary] Player profile data:`, playerProfile);

  // Calcule les stats globales
  // Utiliser une approche en deux étapes pour éviter les problèmes RLS
  const { data: mp, error: mpError } = await supabase
    .from("match_participants")
    .select("match_id, team")
    .eq("user_id", profileId)
    .eq("player_type", "user");

  if (mpError) {
    logger.error("[PlayerSummary] Error fetching participants:", mpError);
  }

  let wins = 0;
  let losses = 0;
  let setsWon = 0;
  let setsLost = 0;
  let matches = 0;

  // Initialiser filteredMp et winMatches pour qu'ils soient toujours définis
  let filteredMp: any[] = [];
  let winMatches = new Set<string>();
  let validMatchIdsForPoints = new Set<string>(); // Déclarer en dehors pour être accessible dans le calcul de la série

  if (mp && mp.length) {
    const matchIds = mp.map((m: any) => m.match_id);
    logger.info("[PlayerSummary] Fetching matches for player:", profileId, "Match IDs:", matchIds.length);

    // IMPORTANT: Récupérer TOUS les matchs du joueur d'abord pour appliquer la limite quotidienne
    // (comme dans home/page.tsx, on applique la limite quotidienne avant de filtrer par club)
    const { data: allMs, error: allMsError } = await supabase
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id, score_team1, score_team2, played_at, created_at")
      .in("id", matchIds)
      .eq("status", "confirmed");

    if (allMsError) {
      logger.error("[PlayerSummary] Error fetching all matches:", allMsError);
    }

    // Filtrer les matchs selon la limite quotidienne de 2 matchs par jour sur TOUS les matchs
    // (tous clubs confondus, comme dans home/page.tsx)
    validMatchIdsForPoints = filterMatchesByDailyLimit(
      mp.map((p: any) => ({ match_id: p.match_id, user_id: profileId })),
      (allMs || []).map((m: any) => ({ id: m.id, played_at: m.played_at || m.created_at })),
      MAX_MATCHES_PER_DAY
    );

    logger.info("[PlayerSummary] Valid matches after daily limit:", validMatchIdsForPoints.size);
    logger.info("[PlayerSummary] Valid match IDs for points:", Array.from(validMatchIdsForPoints));

    // Si on a un club_id, filtrer les matchs pour ne garder que ceux du même club
    // IMPORTANT: Utiliser la même logique que home/page.tsx pour garantir la cohérence
    let validMatchIds = matchIds;
    if (playerClubId) {
      // Récupérer tous les participants de ces matchs (users ET guests pour vérifier complètement)
      const { data: allParticipants } = await supabase
        .from("match_participants")
        .select("match_id, user_id, player_type, guest_player_id")
        .in("match_id", matchIds);

      // Récupérer les profils pour vérifier les club_id - utiliser admin pour bypass RLS
      const participantUserIds = [...new Set((allParticipants || []).filter((p: any) => p.player_type === "user" && p.user_id).map((p: any) => p.user_id))];

      let validUserIds = new Set<string>();
      if (participantUserIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, club_id")
          .in("id", participantUserIds)
          .eq("club_id", playerClubId);

        validUserIds = new Set((profiles || []).map((p: any) => p.id));
      }

      // Grouper les participants par match (comme dans home/page.tsx)
      const participantsByMatch = new Map<string, any[]>();
      (allParticipants || []).forEach((p: any) => {
        if (!participantsByMatch.has(p.match_id)) {
          participantsByMatch.set(p.match_id, []);
        }
        participantsByMatch.get(p.match_id)!.push(p);
      });

      // Filtrer les matchs : ne garder que ceux où TOUS les participants users appartiennent au même club
      // (exactement comme dans home/page.tsx)
      validMatchIds = matchIds.filter(matchId => {
        const participants = participantsByMatch.get(matchId) || [];
        const userParticipants = participants.filter((p: any) => p.player_type === "user" && p.user_id);

        // Si aucun participant user, exclure le match (ne devrait pas arriver)
        if (userParticipants.length === 0) {
          return false;
        }

        // Vérifier que tous les participants users appartiennent au même club
        const allUsersInSameClub = userParticipants.every((p: any) => validUserIds.has(p.user_id));
        return allUsersInSameClub;
      });

      logger.info("[PlayerSummary] Valid matches after club filtering:", validMatchIds.length);
      logger.info("[PlayerSummary] Valid match IDs after club filtering:", validMatchIds);
    }

    // Construire byId à partir de tous les matchs (allMs) pour avoir toutes les données nécessaires
    const byId: Record<string, { winner_team: number; score_team1: number; score_team2: number }> = {};
    (allMs || []).forEach((m: any) => {
      if (!m.winner_team_id || !m.team1_id || !m.team2_id) {
        logger.warn("[PlayerSummary] Skipping match without winner_team_id:", m.id);
        return;
      }

      const winner_team = m.winner_team_id === m.team1_id ? 1 : 2;
      byId[m.id] = {
        winner_team,
        score_team1: m.score_team1 || 0,
        score_team2: m.score_team2 || 0
      };
    });

    // Filtrer mp pour ne garder que les matchs valides (même club) ET qui respectent la limite quotidienne
    // IMPORTANT: Appliquer le filtre club ET limite quotidienne (comme dans home/page.tsx)
    filteredMp = mp.filter((p: any) => {
      const isValidForClub = !playerClubId || validMatchIds.includes(p.match_id);
      const isValidForDailyLimit = validMatchIdsForPoints.has(p.match_id);
      const matchExists = byId[p.match_id] !== undefined; // Le match doit exister dans byId et avoir des données valides
      const hasValidWinner = matchExists && byId[p.match_id]?.winner_team !== undefined;
      const shouldInclude = isValidForClub && isValidForDailyLimit && hasValidWinner;

      if (!shouldInclude) {
        logger.info(`[PlayerSummary] Excluding match ${p.match_id}: club=${isValidForClub}, dailyLimit=${isValidForDailyLimit}, exists=${matchExists}, validWinner=${hasValidWinner}`);
      }

      return shouldInclude;
    });

    logger.info("[PlayerSummary] Filtered matches count:", filteredMp.length);
    logger.info("[PlayerSummary] Filtered match IDs:", filteredMp.map((p: any) => p.match_id));

    // Collecter les matchs gagnés pour le calcul de boosts
    winMatches = new Set<string>();

    filteredMp.forEach((p: any) => {
      const match = byId[p.match_id];
      if (!match) return;

      matches += 1;

      const won = match.winner_team === p.team;
      if (won) {
        wins += 1;
        winMatches.add(p.match_id);
      } else {
        losses += 1;
      }

      if (p.team === 1) {
        setsWon += match.score_team1 || 0;
        setsLost += match.score_team2 || 0;
      } else {
        setsWon += match.score_team2 || 0;
        setsLost += match.score_team1 || 0;
      }
    });

    logger.info("[PlayerSummary] Player stats calculated:", { matches, wins, losses, setsWon, setsLost });
    logger.info("[PlayerSummary] Filtered matches count:", filteredMp.length);
    logger.info("[PlayerSummary] Win matches count:", winMatches.size);
    logger.info("[PlayerSummary] Win matches:", Array.from(winMatches));
  }
  // Calcul du bonus XP pour le premier avis valide ( +10 XP une seule fois )
  // Un avis est valide si rating > 3 OU (rating <= 3 ET words > 6)
  let reviewsBonus = 0;
  {
    const { data: myReviews } = await supabase
      .from("reviews")
      .select("rating, comment")
      .eq("user_id", profileId);

    if (myReviews && myReviews.length > 0) {
      // Vérifier si au moins un avis est valide
      const { isReviewValidForBonus } = await import("@/lib/utils/review-utils");
      const hasValidReview = myReviews.some((r: any) =>
        isReviewValidForBonus(r.rating || 0, r.comment || null)
      );

      if (hasValidReview) {
        reviewsBonus = 10;
      }
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

  // Calculer les points avec boosts
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

  // Calculer les séries de victoires (meilleure et en cours)
  // IMPORTANT: Seuls les matchs qui respectent la limite quotidienne comptent pour la série
  let streak = 0;
  let currentWinStreak = 0;
  if (mp && mp.length) {
    const matchIds = mp.map((m: any) => m.match_id);

    const { data: ms, error: msStreakError } = await supabase
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id, created_at, played_at")
      .in("id", matchIds)
      .order("created_at", { ascending: false });

    if (msStreakError) {
      // Extraire les propriétés de l'erreur de manière sécurisée
      const errorDetails: Record<string, any> = {};
      if (msStreakError?.message) errorDetails.message = msStreakError.message;
      if (msStreakError?.details) errorDetails.details = msStreakError.details;
      if (msStreakError?.hint) errorDetails.hint = msStreakError.hint;
      if (msStreakError?.code) errorDetails.code = msStreakError.code;

      // Filtrer les valeurs null/undefined avant de logger
      const filteredDetails = Object.fromEntries(
        Object.entries(errorDetails).filter(([_, v]) => v != null && v !== "")
      );

      // Ne logger que si on a des détails valides après filtrage
      // Éviter de logger des objets vides qui polluent la console
      const hasValidDetails = Object.keys(filteredDetails).length > 0;

      if (hasValidDetails) {
        logger.error("[PlayerSummary] Error fetching matches for streak:", filteredDetails);
      } else {
        // Si l'erreur existe mais n'a pas de propriétés standard, 
        // on vérifie si c'est une vraie erreur ou juste un état vide
        const errorString = String(msStreakError);
        const isMeaningfulError = errorString !== "[object Object]" && errorString !== "null" && errorString !== "undefined";

        // Ne logger que si l'erreur a un contenu significatif
        if (isMeaningfulError) {
          logger.warn("[PlayerSummary] Error fetching matches for streak (no standard properties):", errorString);
        }
        // Sinon, on ignore silencieusement pour éviter la pollution de la console
      }
    }

    if (ms && ms.length > 0) {
      // Filtrer les matchs pour ne garder que ceux qui respectent la limite quotidienne
      // Utiliser validMatchIdsForPoints qui a déjà été calculé plus haut
      const validMatchesForStreak = ms.filter((m: any) => {
        // Si validMatchIdsForPoints a été calculé (dans le scope précédent), l'utiliser
        if (validMatchIdsForPoints.size > 0) {
          return validMatchIdsForPoints.has(m.id);
        }
        // Fallback: recalculer si validMatchIdsForPoints n'est pas disponible
        const matchParticipants = mp.map((p: any) => ({ match_id: p.match_id, user_id: profileId }));
        const validIds = filterMatchesByDailyLimit(
          matchParticipants,
          ms.map((m: any) => ({ id: m.id, played_at: m.played_at || m.created_at || new Date().toISOString() })),
          MAX_MATCHES_PER_DAY
        );
        return validIds.has(m.id);
      });

      const byId: Record<string, number> = {};
      validMatchesForStreak.forEach((m: any) => {
        if (!m.winner_team_id || !m.team1_id || !m.team2_id) return;
        const winner_team = m.winner_team_id === m.team1_id ? 1 : 2;
        byId[m.id] = winner_team;
      });

      // Filtrer mp pour ne garder que les matchs valides
      const validMpForStreak = mp.filter((p: any) => byId[p.match_id] !== undefined);

      const matchesSortedDesc = [...validMpForStreak].sort((a: any, b: any) => {
        const aMatch = validMatchesForStreak.find((m: any) => m.id === a.match_id);
        const bMatch = validMatchesForStreak.find((m: any) => m.id === b.match_id);
        return (bMatch?.created_at || "").localeCompare(aMatch?.created_at || "");
      });
      const matchesSortedAsc = [...matchesSortedDesc].reverse();

      let rollingStreak = 0;
      for (const p of matchesSortedAsc) {
        if (!byId[p.match_id]) continue;
        const won = byId[p.match_id] === p.team;
        if (won) {
          rollingStreak++;
          if (rollingStreak > streak) streak = rollingStreak;
        } else {
          rollingStreak = 0;
        }
      }

      currentWinStreak = 0;
      for (const p of matchesSortedDesc) {
        if (!byId[p.match_id]) continue;
        const won = byId[p.match_id] === p.team;
        if (won) {
          currentWinStreak++;
        } else {
          break;
        }
      }
    }
  }

  logger.info("[PlayerSummary] Streak calculated:", { best: streak, current: currentWinStreak });

  // IMPORTANT: Calculer les stats pour les badges EXACTEMENT comme dans la page badges
  // (sans limite quotidienne, points simples wins*10 + losses*3)
  // Cela garantit que le nombre de badges affiché correspond à celui de la page badges
  let badgeWins = 0;
  let badgeLosses = 0;
  let badgeMatches = 0;
  let badgePoints = 0;
  let badgeStreak = 0;

  // Recalculer les stats SANS limite quotidienne (comme dans la page badges)
  if (mp && mp.length) {
    const matchIds = mp.map((m: any) => m.match_id);

    let validMatchIdsForBadges = matchIds;
    if (playerClubId) {
      // Récupérer tous les participants de ces matchs
      const { data: allParticipants } = await supabase
        .from("match_participants")
        .select("match_id, user_id, player_type")
        .in("match_id", matchIds)
        .eq("player_type", "user");

      // Récupérer les profils pour vérifier les club_id - utiliser admin pour bypass RLS
      const participantUserIds = [...new Set((allParticipants || []).map((p: any) => p.user_id).filter(Boolean))];
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, club_id")
        .in("id", participantUserIds)
        .eq("club_id", playerClubId);

      const validUserIds = new Set((profiles || []).map((p: any) => p.id));

      // Filtrer les matchs : ne garder que ceux où tous les participants users appartiennent au même club
      validMatchIdsForBadges = matchIds.filter(matchId => {
        const participants = (allParticipants || []).filter((p: any) => p.match_id === matchId);
        return participants.every((p: any) =>
          p.player_type === "guest" || validUserIds.has(p.user_id)
        );
      });
    }

    const { data: msForBadges } = await supabase
      .from("matches")
      .select("id, winner_team_id, team1_id, team2_id, created_at")
      .in("id", validMatchIdsForBadges);

    const byIdForBadges: Record<string, number> = {};
    (msForBadges || []).forEach((m: any) => {
      if (!m.winner_team_id || !m.team1_id || !m.team2_id) return;
      const winner_team = m.winner_team_id === m.team1_id ? 1 : 2;
      byIdForBadges[m.id] = winner_team;
    });

    // Filtrer mp pour ne garder que les matchs valides (sans limite quotidienne)
    const filteredMpForBadges = playerClubId
      ? mp.filter((p: any) => validMatchIdsForBadges.includes(p.match_id))
      : mp;

    filteredMpForBadges.forEach((p: any) => {
      if (byIdForBadges[p.match_id] === p.team) badgeWins += 1;
      else if (byIdForBadges[p.match_id]) badgeLosses += 1;
    });
    badgeMatches = filteredMpForBadges.filter((p: any) => !!byIdForBadges[p.match_id]).length;

    // Calculer le streak pour les badges (comme dans la page badges)
    if (msForBadges && msForBadges.length > 0) {
      const winnerByMatch: Record<string, number> = {};
      msForBadges.forEach((m: any) => {
        if (!m.winner_team_id || !m.team1_id || !m.team2_id) return;
        winnerByMatch[m.id] = m.winner_team_id === m.team1_id ? 1 : 2;
      });

      // Trier les participations par date du match desc
      const mpSorted = [...filteredMpForBadges].sort((a: any, b: any) => {
        const aDate = msForBadges.find((m: any) => m.id === a.match_id)?.created_at || "";
        const bDate = msForBadges.find((m: any) => m.id === b.match_id)?.created_at || "";
        return bDate.localeCompare(aDate);
      });

      let currentStreak = 0;
      let bestStreak = 0;
      for (const p of mpSorted) {
        const winnerTeam = winnerByMatch[p.match_id];
        if (!winnerTeam) continue;
        if (winnerTeam === p.team) {
          currentStreak += 1;
          if (currentStreak > bestStreak) bestStreak = currentStreak;
        } else {
          currentStreak = 0;
        }
      }
      badgeStreak = bestStreak;
    }
  }

  // Points simples pour les badges (comme dans la page badges)
  badgePoints = badgeWins * 10 + badgeLosses * 3;

  // Calcul des badges dynamiques basés sur les stats (EXACTEMENT comme la page badges)
  const statsForBadges: PlayerStats = { wins: badgeWins, losses: badgeLosses, matches: badgeMatches, points: badgePoints, streak: badgeStreak };
  let computedBadges = getBadges(statsForBadges);
  // Utiliser icon + title comme clé unique car plusieurs badges peuvent avoir la même icône
  const obtainedBadgeKeys = new Set(computedBadges.map(b => `${b.icon}|${b.title}`));

  // Badges liés aux avis: Contributeur (premier avis valide du joueur)
  // Un avis est valide si rating > 3 OU (rating <= 3 ET words > 6)
  const { data: myReviewsForBadge } = await supabase
    .from("reviews")
    .select("rating, comment")
    .eq("user_id", profileId);

  // Ajouter les badges d'avis au Set (évite les doublons)
  const extraObtained = new Set<string>();
  if (myReviewsForBadge && myReviewsForBadge.length > 0) {
    // Vérifier si au moins un avis est valide
    const { isReviewValidForBonus } = await import("@/lib/utils/review-utils");
    const hasValidReviewForBadge = myReviewsForBadge.some((r: any) =>
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
