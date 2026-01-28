import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "club-challenges";

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  : null;

type ChallengeRecord = {
  id: string;
  club_id: string;
  title: string;
  start_date: string;
  end_date: string;
  objective: string;
  reward_type: "points" | "badge";
  reward_label: string;
  created_at: string;
};

type ChallengeResponse = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  objective: string;
  rewardType: "points" | "badge";
  rewardLabel: string;
  createdAt: string;
  status: "upcoming" | "active" | "completed";
  progress: { current: number; target: number };
  rewardClaimed: boolean;
};

function computeStatus(record: ChallengeRecord): "upcoming" | "active" | "completed" {
  const now = new Date();
  const start = new Date(record.start_date);
  const end = new Date(record.end_date);
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "active";
}

async function resolveClubId(userId: string) {
  if (!supabaseAdmin) return null;

  // Essayer via le profil (pour les joueurs)
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("club_id, club_slug")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.club_id) {
    return profile.club_id;
  }

  // Tenter avec club_slug enregistré sur le profil
  if (profile?.club_slug) {
    const { data: clubBySlug, error: clubSlugError } = await supabaseAdmin
      .from("clubs")
      .select("id")
      .eq("slug", profile.club_slug)
      .maybeSingle();
    if (!clubSlugError && clubBySlug?.id) {
      return clubBySlug.id;
    }
  }

  // Dernier recours: métadonnées de l'utilisateur auth (club_id ou club_slug stockés)
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const metadata = (authUser?.user?.user_metadata || {}) as Record<string, any>;
    const metaClubId = typeof metadata.club_id === "string" ? metadata.club_id : null;
    if (metaClubId) {
      return metaClubId;
    }
    const metaClubSlug = typeof metadata.club_slug === "string" ? metadata.club_slug : null;
    if (metaClubSlug) {
      const { data: clubFromMetaSlug } = await supabaseAdmin
        .from("clubs")
        .select("id")
        .eq("slug", metaClubSlug)
        .maybeSingle();
      if (clubFromMetaSlug?.id) {
        return clubFromMetaSlug.id;
      }
    }
  } catch (authError) {
    logger.warn({ userId: userId.substring(0, 8) + "…", error: authError }, "[api/player/challenges] resolveClubId auth metadata lookup failed");
  }

  logger.warn({ userId: userId.substring(0, 8) + "…" }, "[api/player/challenges] resolveClubId: aucun club trouvé pour userId");
  return null;
}

async function loadChallenges(clubId: string): Promise<ChallengeRecord[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(`${clubId}.json`);
  if (error || !data) {
    if (error && !error.message?.toLowerCase().includes("not found")) {
      logger.warn({ clubId: clubId.substring(0, 8) + "…", error }, "[api/player/challenges] load error");
    }
    return [];
  }
  try {
    const text = await data.text();
    if (!text || text.trim().length === 0) {
      logger.warn({ clubId: clubId.substring(0, 8) + "…" }, "[api/player/challenges] Empty JSON for club, returning []");
      return [];
    }
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed as ChallengeRecord[];
    }
  } catch (err) {
    logger.warn({ clubId: clubId.substring(0, 8) + "…", error: err }, "[api/player/challenges] invalid JSON");
  }
  return [];
}

function extractTarget(objective: string): number {
  const match = objective.match(/(\d+)/);
  if (!match) return 1;
  const value = parseInt(match[1], 10);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return value;
}

function isWinObjective(objective: string) {
  const lower = objective.toLowerCase();
  return /(remporter|gagner|victoire|victoires|remporte|gagne|gagné|remporté|win|wins|won)/.test(lower);
}

function isDifferentPartnersObjective(objective: string) {
  const lower = objective.toLowerCase();
  return /(partenaire|partenaires|coéquipier|coéquipiers|joueur|joueurs).*(différent|différents|différente|différentes|divers|variés)/.test(lower) ||
    /(différent|différents|différente|différentes|divers|variés).*(partenaire|partenaires|coéquipier|coéquipiers|joueur|joueurs)/.test(lower);
}

function isConsecutiveWinsObjective(objective: string) {
  const lower = objective.toLowerCase();
  // Détecter si l'objectif mentionne "consécutif", "consécutifs", "consécutivement", "sans défaite", "sans défaites", "d'affilée", "de suite"
  return /(consécutif|consécutifs|consécutivement|consecutive|consecutives|sans.*défaite|sans.*défaites|d'affilée|de suite|enchaîner|enchaîné|enchaînés)/.test(lower);
}

// NEW: Clean Sheet - gagner sans perdre de set (2-0, 3-0, etc.)
function isCleanSheetObjective(objective: string) {
  const lower = objective.toLowerCase();
  return /(sans perdre de set|sans concéder de set|sans que l'adversaire.*prenne.*set|2-0|3-0|4-0|clean sheet)/.test(lower);
}

// NEW: Week-end - jouer le samedi ou dimanche
function isWeekendObjective(objective: string) {
  const lower = objective.toLowerCase();
  return /(week-end|weekend|samedi|dimanche)/.test(lower);
}

// NEW: 3 Sets - matchs en 3 sets
function isThreeSetsObjective(objective: string) {
  const lower = objective.toLowerCase();
  return /(3 sets|trois sets|match long|long match)/.test(lower);
}

// NEW: Jouer avant une certaine heure - extrait l'heure cible
function extractBeforeHour(objective: string): number | null {
  const lower = objective.toLowerCase();
  // Patterns: "avant X heure(s)", "jusqu'à X heure(s)"
  const match = lower.match(/(?:avant|jusqu'à|jusqu'a)\s*(\d{1,2})\s*heures?/i);
  if (match) {
    const hour = parseInt(match[1], 10);
    if (hour >= 0 && hour <= 23) return hour;
  }
  return null;
}

// NEW: Jouer après une certaine heure - extrait l'heure cible
function extractAfterHour(objective: string): number | null {
  const lower = objective.toLowerCase();
  // Patterns: "après X heure(s)", "à partir de X heure(s)"
  const match = lower.match(/(?:après|a partir de|à partir de)\s*(\d{1,2})\s*heures?/i);
  if (match) {
    const hour = parseInt(match[1], 10);
    if (hour >= 0 && hour <= 23) return hour;
  }
  return null;
}

type MatchHistoryItem = {
  matchId: string;
  playedAt: string | null;
  isWinner: boolean;
  partnerId?: string | null; // ID du partenaire (autre joueur de la même équipe)
  // NEW: Score data for clean sheet detection
  myScore?: number; // Score de l'équipe du joueur (en sets gagnés)
  opponentScore?: number; // Score de l'équipe adverse (en sets gagnés)
};

async function loadPlayerHistory(userId: string): Promise<MatchHistoryItem[]> {
  if (!supabaseAdmin) return [];

  logger.info({ userId: userId.substring(0, 8) + "…" }, "[loadPlayerHistory] Fetching matches for userId");

  // ÉTAPE 1: Récupérer les match_ids du joueur (EXACTEMENT comme dans la page historique)
  const { data: userParticipations, error: partError } = await supabaseAdmin
    .from("match_participants")
    .select("match_id, team")
    .eq("user_id", userId)
    .eq("player_type", "user");

  logger.info({ userId: userId.substring(0, 8) + "…", participationsCount: userParticipations?.length || 0, error: partError }, "[loadPlayerHistory] User participations");

  if (partError || !userParticipations || userParticipations.length === 0) {
    logger.warn({ userId: userId.substring(0, 8) + "…" }, "[loadPlayerHistory] ⚠️ NO PARTICIPATIONS found for user");
    return [];
  }

  const matchIds = userParticipations.map((p) => p.match_id);
  const teamMap = new Map(userParticipations.map((p) => [p.match_id, p.team]));
  logger.info({ userId: userId.substring(0, 8) + "…", matchIdsCount: matchIds.length }, "[loadPlayerHistory] Found match IDs for user");

  // ÉTAPE 2: Récupérer les détails des matchs
  const { data: matches, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("id, played_at, winner_team_id, team1_id, team2_id, score_team1, score_team2, created_at")
    .in("id", matchIds)
    .eq("status", "confirmed") // On ne prend que les matchs validés
    .order("played_at", { ascending: true });

  logger.info({ userId: userId.substring(0, 8) + "…", matchesCount: matches?.length || 0, error: matchError }, "[loadPlayerHistory] Matches fetched");

  if (matchError || !matches) {
    logger.warn({ userId: userId.substring(0, 8) + "…", error: matchError }, "[loadPlayerHistory] ⚠️ Error fetching matches");
    return [];
  }

  logger.info({ userId: userId.substring(0, 8) + "…", matchesCount: matches.length }, "[loadPlayerHistory] ✅ Found matches for user");

  // ÉTAPE 2.5: NO LIMIT for challenges
  // Le user veut que tous les matchs validés comptent, sans la limite de 2 par jour.
  // On garde donc tous les matchs récupérés (qui sont déjà filtrés par status='confirmed')
  const validMatches = matches;

  // ÉTAPE 3: Récupérer tous les participants pour identifier les partenaires
  const { data: allParticipants } = await supabaseAdmin
    .from("match_participants")
    .select("match_id, user_id, team, player_type")
    .in("match_id", matchIds);

  // Créer une map des partenaires par match
  const partnerMap = new Map<string, string | null>();
  if (allParticipants) {
    allParticipants.forEach((p: any) => {
      const userTeam = teamMap.get(p.match_id);
      // Si c'est un joueur de la même équipe que l'utilisateur, mais pas l'utilisateur lui-même
      if (p.user_id !== userId && p.team === userTeam && p.player_type === "user") {
        partnerMap.set(p.match_id, p.user_id);
      }
    });
  }

  return validMatches.map((match) => {
    const team = teamMap.get(match.id) || null;
    const teamNum = typeof team === "number" ? team : team ? Number(team) : null;

    let isWinner = false;
    if (match.winner_team_id && teamNum) {
      const participantTeamId = teamNum === 1 ? match.team1_id : match.team2_id;
      isWinner = match.winner_team_id === participantTeamId;
    } else if (teamNum && match.score_team1 != null && match.score_team2 != null && match.score_team1 !== match.score_team2) {
      isWinner = teamNum === 1 ? match.score_team1 > match.score_team2 : match.score_team2 > match.score_team1;
    }

    const partnerId = partnerMap.get(match.id) || null;

    // NEW: Calculate scores for clean sheet detection
    const myScore = teamNum === 1 ? Number(match.score_team1) : Number(match.score_team2);
    const opponentScore = teamNum === 1 ? Number(match.score_team2) : Number(match.score_team1);

    logger.info({ userId: userId.substring(0, 8) + "…", matchId: match.id.substring(0, 8) + "…", team: teamNum, isWinner, partnerId: partnerId?.substring(0, 8) + "…" || null, playedAt: match.played_at, myScore, opponentScore }, "[loadPlayerHistory] Match details");

    return {
      matchId: match.id,
      playedAt: match.played_at ?? match.created_at ?? null,
      isWinner,
      partnerId,
      myScore: myScore ?? undefined,
      opponentScore: opponentScore ?? undefined,
    };
  });
}

function computeProgress(record: ChallengeRecord, history: MatchHistoryItem[]): { current: number; target: number } {
  const target = Math.max(1, extractTarget(record.objective));
  const metricIsWin = isWinObjective(record.objective);
  const isDifferentPartners = isDifferentPartnersObjective(record.objective);
  const isConsecutiveWins = isConsecutiveWinsObjective(record.objective);

  // Convertir les dates en objets Date et normaliser au début/fin de journée en UTC
  const start = new Date(record.start_date);
  const end = new Date(record.end_date);

  // Normaliser au début de la journée (00:00:00) en UTC pour start
  start.setUTCHours(0, 0, 0, 0);

  // Normaliser à la fin de la journée (23:59:59) en UTC pour end
  end.setUTCHours(23, 59, 59, 999);

  logger.info({ challengeId: record.id.substring(0, 8) + "…", objective: record.objective, target, metricIsWin, isDifferentPartners, isConsecutiveWins, period: { start: start.toISOString(), end: end.toISOString() }, totalMatches: history.length }, "[Challenge] Computing progress");

  const relevant = history.filter((item) => {
    if (!item.playedAt) {
      logger.info({ challengeId: record.id.substring(0, 8) + "…", matchId: item.matchId.substring(0, 8) + "…" }, "[Challenge] Match excluded: no playedAt");
      return false;
    }
    const played = new Date(item.playedAt);
    if (Number.isNaN(played.getTime())) {
      logger.info({ challengeId: record.id.substring(0, 8) + "…", matchId: item.matchId.substring(0, 8) + "…" }, "[Challenge] Match excluded: invalid date");
      return false;
    }
    const inPeriod = played >= start && played <= end;
    logger.info({ challengeId: record.id.substring(0, 8) + "…", matchId: item.matchId.substring(0, 8) + "…", played: played.toISOString(), isWinner: item.isWinner, partnerId: item.partnerId?.substring(0, 8) + "…" || null, inPeriod }, `[Challenge] Match ${inPeriod ? '✅' : '❌'}`);
    return inPeriod;
  });

  // Trier les matchs par date croissante pour les victoires consécutives
  const sortedRelevant = [...relevant].sort((a, b) => {
    if (!a.playedAt || !b.playedAt) return 0;
    return new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime();
  });

  let current = 0;

  if (isConsecutiveWins && metricIsWin) {
    // Pour les challenges de victoires consécutives : compter la série actuelle (se réinitialise à 0 en cas de défaite)
    // La barre de progression doit refléter la série en cours, pas la meilleure série historique
    let currentStreak = 0;

    for (const item of sortedRelevant) {
      if (item.isWinner) {
        currentStreak++;
        logger.info({ challengeId: record.id.substring(0, 8) + "…", matchId: item.matchId.substring(0, 8) + "…", streak: currentStreak }, "[Challenge] Match: VICTOIRE - streak updated");
      } else {
        // Une défaite interrompt la série et la réinitialise à 0
        logger.info({ challengeId: record.id.substring(0, 8) + "…", matchId: item.matchId.substring(0, 8) + "…", previousStreak: currentStreak }, "[Challenge] Match: DÉFAITE - streak interrompu");
        currentStreak = 0;
      }
    }

    // Utiliser la série actuelle (currentStreak) au lieu de la meilleure série historique
    // Cela permet à la barre de progression de retomber à 0 si le joueur perd un match
    current = currentStreak;
    logger.info({ challengeId: record.id.substring(0, 8) + "…", currentStreak, target }, "[Challenge] Consecutive wins: current streak");
  } else if (isDifferentPartners) {
    // Pour les challenges avec partenaires différents, compter uniquement les partenaires uniques
    const uniquePartners = new Set<string>();

    sortedRelevant.forEach((item) => {
      if (item.partnerId) {
        // Si l'objectif mentionne "gagner/remporter", ne compter que les victoires
        // Sinon (juste "jouer"), compter tous les matchs
        if (!metricIsWin || item.isWinner) {
          uniquePartners.add(item.partnerId);
        }
      }
    });

    current = uniquePartners.size;
    logger.info({ challengeId: record.id.substring(0, 8) + "…", uniquePartnersCount: uniquePartners.size, uniquePartners: Array.from(uniquePartners).map(id => id.substring(0, 8) + "…") }, "[Challenge] Different partners found");
    logger.info({ challengeId: record.id.substring(0, 8) + "…", metricIsWin }, `[Challenge] Counting ${metricIsWin ? 'wins only' : 'all matches'} with different partners`);
  } else if (isCleanSheetObjective(record.objective)) {
    // NEW: Clean Sheet - victoires sans perdre de set (score adversaire = 0)
    current = sortedRelevant.filter((item) => {
      // Doit être une victoire ET l'adversaire doit avoir 0 set
      return item.isWinner && item.opponentScore === 0;
    }).length;
    logger.info({ challengeId: record.id.substring(0, 8) + "…", current, target }, "[Challenge] Clean Sheet: counting wins with opponent score = 0");
  } else if (isWeekendObjective(record.objective)) {
    // NEW: Week-end - matchs joués le samedi ou dimanche
    const weekendMatches = sortedRelevant.filter((item) => {
      if (!item.playedAt) return false;
      const day = new Date(item.playedAt).getDay();
      return day === 0 || day === 6; // 0 = dimanche, 6 = samedi
    });
    // Si l'objectif mentionne "gagner", compter uniquement les victoires du week-end
    if (metricIsWin) {
      current = weekendMatches.filter((item) => item.isWinner).length;
    } else {
      current = weekendMatches.length;
    }
    logger.info({ challengeId: record.id.substring(0, 8) + "…", current, target, weekendMatchesTotal: weekendMatches.length }, "[Challenge] Weekend: counting matches on Saturday/Sunday");
  } else if (extractBeforeHour(record.objective) !== null) {
    // NEW: Jouer avant une certaine heure
    const targetHour = extractBeforeHour(record.objective)!;
    const beforeHourMatches = sortedRelevant.filter((item) => {
      if (!item.playedAt) return false;
      const hour = new Date(item.playedAt).getHours();
      return hour < targetHour;
    });
    if (metricIsWin) {
      current = beforeHourMatches.filter((item) => item.isWinner).length;
    } else {
      current = beforeHourMatches.length;
    }
    logger.info({ challengeId: record.id.substring(0, 8) + "…", current, target, targetHour }, "[Challenge] Before Hour: counting matches played before specified hour");
  } else if (extractAfterHour(record.objective) !== null) {
    // NEW: Jouer après une certaine heure
    const targetHour = extractAfterHour(record.objective)!;
    const afterHourMatches = sortedRelevant.filter((item) => {
      if (!item.playedAt) return false;
      const hour = new Date(item.playedAt).getHours();
      return hour >= targetHour;
    });
    if (metricIsWin) {
      current = afterHourMatches.filter((item) => item.isWinner).length;
    } else {
      current = afterHourMatches.length;
    }
    logger.info({ challengeId: record.id.substring(0, 8) + "…", current, target, targetHour }, "[Challenge] After Hour: counting matches played after specified hour");
  } else if (isThreeSetsObjective(record.objective)) {
    // NEW: 3 Sets
    // On compte les matchs où la somme des sets = 3 (exemple 2-1 ou 1-2)
    const threeSetsMatches = sortedRelevant.filter((item) => {
      // myScore et opponentScore sont des nombres (castés précédemment)
      // Si undefined, on ignore
      if (item.myScore === undefined || item.opponentScore === undefined) return false;
      return (item.myScore + item.opponentScore) === 3;
    });

    if (metricIsWin) {
      current = threeSetsMatches.filter((item) => item.isWinner).length;
    } else {
      current = threeSetsMatches.length;
    }
    logger.info({ challengeId: record.id.substring(0, 8) + "…", current, target }, "[Challenge] 3 Sets: counting matches with total score = 3");
  } else if (metricIsWin) {
    current = sortedRelevant.filter((item) => item.isWinner).length;
  } else {
    current = sortedRelevant.length;
  }

  logger.info({ challengeId: record.id.substring(0, 8) + "…", current, target, relevantMatches: sortedRelevant.length, type: isConsecutiveWins ? 'consecutive wins' : isDifferentPartners ? 'counting unique partners' : metricIsWin ? 'counting wins only' : 'counting all' }, "[Challenge] Result");

  return {
    current: Math.min(current, target),
    target,
  };
}

export async function GET(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Serveur mal configuré" }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userIdPreview = user.id.substring(0, 8) + "…";

  const clubId = await resolveClubId(user.id);
  logger.info({ userId: userIdPreview, clubId: clubId?.substring(0, 8) + "…" || null }, "[api/player/challenges] Resolved clubId for user");
  if (!clubId) {
    logger.warn({ userId: userIdPreview }, "[api/player/challenges] No clubId found for user, returning empty challenges");
    return NextResponse.json({ challenges: [] });
  }

  const records = await loadChallenges(clubId);
  logger.info({ userId: userIdPreview, clubId: clubId.substring(0, 8) + "…", challengesCount: records.length }, "[api/player/challenges] Loaded challenges for club");
  if (records.length > 0) {
    logger.info({
      userId: userIdPreview, challenges: records.map(r => ({
        id: r.id.substring(0, 8) + "…",
        title: r.title,
        start_date: r.start_date,
        end_date: r.end_date,
        objective: r.objective
      }))
    }, "[Player] Challenges");
  }

  if (records.length === 0) {
    return NextResponse.json({ challenges: [] });
  }

  logger.info({ userId: userIdPreview }, "[api/player/challenges] About to load player history for user");
  const history = await loadPlayerHistory(user.id);
  logger.info({ userId: userIdPreview, matchesCount: history.length }, "[api/player/challenges] Player - Loaded matches from history");

  if (history.length > 0) {
    logger.info({
      userId: userIdPreview, recentMatches: history.slice(-5).map(h => ({
        matchId: h.matchId.substring(0, 8) + "…",
        playedAt: h.playedAt,
        isWinner: h.isWinner
      }))
    }, "[api/player/challenges] Recent matches");
  } else {
    logger.warn({ userId: userIdPreview }, "[api/player/challenges] ⚠️ NO MATCHES FOUND for user - this will cause progress to be 0");
  }

  // Récupérer les récompenses déjà réclamées
  let claimedSet = new Set<string>();
  try {
    const { data: claimedRewards, error: rewardsError } = await supabaseAdmin!
      .from("challenge_rewards")
      .select("challenge_id")
      .eq("user_id", user.id);

    if (rewardsError) {
      logger.warn({ userId: userIdPreview, error: rewardsError.message }, "[api/player/challenges] ⚠️ Could not fetch rewards (table may not exist yet)");
    } else {
      claimedSet = new Set(claimedRewards?.map(r => r.challenge_id) || []);
    }
  } catch (err) {
    logger.warn({ userId: userIdPreview, error: err }, "[api/player/challenges] ⚠️ Exception fetching rewards");
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 jour = 24h

  const challenges: ChallengeResponse[] = records
    .filter((record) => {
      // Filtrer les challenges expirés depuis plus d'1 jour
      const endDate = new Date(record.end_date);
      const isExpiredMoreThanOneDay = endDate < oneDayAgo;

      if (isExpiredMoreThanOneDay) {
        logger.info({ challengeId: record.id.substring(0, 8) + "…", endDate: record.end_date }, "[Challenge] Filtered out - expired more than 1 day ago");
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((record) => {
      const progress = computeProgress(record, history);
      return {
        id: record.id,
        title: record.title,
        startDate: record.start_date,
        endDate: record.end_date,
        objective: record.objective,
        rewardType: record.reward_type,
        rewardLabel: record.reward_label,
        createdAt: record.created_at,
        status: computeStatus(record),
        progress,
        rewardClaimed: claimedSet.has(record.id),
      };
    });

  return NextResponse.json({ challenges });
}
