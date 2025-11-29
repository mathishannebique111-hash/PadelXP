import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { filterMatchesByDailyLimit } from "@/lib/utils/match-limit-utils";
import { MAX_MATCHES_PER_DAY } from "@/lib/match-constants";

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
    console.warn("[api/player/challenges] resolveClubId auth metadata lookup failed", authError);
  }
  
  console.warn("[api/player/challenges] resolveClubId: aucun club trouvé pour userId", userId);
  return null;
}

async function loadChallenges(clubId: string): Promise<ChallengeRecord[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(`${clubId}.json`);
  if (error || !data) {
    if (error && !error.message?.toLowerCase().includes("not found")) {
      console.warn("[api/player/challenges] load error", error);
    }
    return [];
  }
  try {
    const text = await data.text();
    if (!text || text.trim().length === 0) {
      console.warn(`[api/player/challenges] Empty JSON for club ${clubId}, returning []`);
      return [];
    }
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed as ChallengeRecord[];
    }
  } catch (err) {
    console.warn("[api/player/challenges] invalid JSON", err);
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

type MatchHistoryItem = {
  matchId: string;
  playedAt: string | null;
  isWinner: boolean;
  partnerId?: string | null; // ID du partenaire (autre joueur de la même équipe)
};

async function loadPlayerHistory(userId: string): Promise<MatchHistoryItem[]> {
  if (!supabaseAdmin) return [];
  
  console.log(`[loadPlayerHistory] Fetching matches for userId: ${userId}`);
  
  // ÉTAPE 1: Récupérer les match_ids du joueur (EXACTEMENT comme dans la page historique)
  const { data: userParticipations, error: partError } = await supabaseAdmin
    .from("match_participants")
    .select("match_id, team")
    .eq("user_id", userId)
    .eq("player_type", "user");

  console.log(`[loadPlayerHistory] User participations:`, userParticipations?.length || 0, "Error:", partError);

  if (partError || !userParticipations || userParticipations.length === 0) {
    console.warn(`[loadPlayerHistory] ⚠️ NO PARTICIPATIONS found for user ${userId}`);
    return [];
  }

  const matchIds = userParticipations.map((p) => p.match_id);
  const teamMap = new Map(userParticipations.map((p) => [p.match_id, p.team]));
  console.log(`[loadPlayerHistory] Found ${matchIds.length} match IDs for user`);

  // ÉTAPE 2: Récupérer les détails des matchs
  const { data: matches, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("id, played_at, winner_team_id, team1_id, team2_id, score_team1, score_team2, created_at")
    .in("id", matchIds)
    .order("played_at", { ascending: true });

  console.log(`[loadPlayerHistory] Matches fetched:`, matches?.length || 0, "Error:", matchError);

  if (matchError || !matches) {
    console.warn(`[loadPlayerHistory] ⚠️ Error fetching matches:`, matchError);
    return [];
  }

  console.log(`[loadPlayerHistory] ✅ Found ${matches.length} matches for user ${userId}`);

  // ÉTAPE 2.5: Filtrer les matchs selon la limite quotidienne (2 matchs par jour)
  // Seuls les matchs qui comptent pour les points comptent pour les challenges
  const matchParticipants = userParticipations.map((p) => ({
    match_id: p.match_id,
    user_id: userId,
  }));
  
  const validMatchIdsForPoints = filterMatchesByDailyLimit(
    matchParticipants,
    matches.map((m) => ({
      id: m.id,
      played_at: m.played_at ?? m.created_at ?? new Date().toISOString(),
    })),
    MAX_MATCHES_PER_DAY
  );

  console.log(`[loadPlayerHistory] Valid matches after daily limit: ${validMatchIdsForPoints.size} / ${matches.length}`);

  // Filtrer les matchs pour ne garder que ceux qui respectent la limite quotidienne
  const validMatches = matches.filter((m) => validMatchIdsForPoints.has(m.id));

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
    console.log(`[loadPlayerHistory] Match ${match.id.substring(0, 8)}: team=${teamNum}, isWinner=${isWinner}, partnerId=${partnerId?.substring(0, 8) || 'none'}, playedAt=${match.played_at}`);

    return {
      matchId: match.id,
      playedAt: match.played_at ?? match.created_at ?? null,
      isWinner,
      partnerId,
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

  console.log(`[Challenge ${record.id}] Computing progress:`, {
    objective: record.objective,
    target,
    metricIsWin,
    isDifferentPartners,
    isConsecutiveWins,
    period: { 
      start: start.toISOString(), 
      end: end.toISOString(),
      startLocal: start.toString(),
      endLocal: end.toString()
    },
    totalMatches: history.length
  });

  const relevant = history.filter((item) => {
    if (!item.playedAt) {
      console.log(`  ❌ Match ${item.matchId.substring(0, 8)} excluded: no playedAt`);
      return false;
    }
    const played = new Date(item.playedAt);
    if (Number.isNaN(played.getTime())) {
      console.log(`  ❌ Match ${item.matchId.substring(0, 8)} excluded: invalid date`);
      return false;
    }
    const inPeriod = played >= start && played <= end;
    console.log(`  ${inPeriod ? '✅' : '❌'} Match ${item.matchId.substring(0, 8)}: played=${played.toISOString()} (${played.toString()}), isWinner=${item.isWinner}, partnerId=${item.partnerId?.substring(0, 8) || 'none'}, inPeriod=${inPeriod}`);
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
        console.log(`  ✅ Match ${item.matchId.substring(0, 8)}: VICTOIRE - streak=${currentStreak}`);
      } else {
        // Une défaite interrompt la série et la réinitialise à 0
        console.log(`  ❌ Match ${item.matchId.substring(0, 8)}: DÉFAITE - streak interrompu (était ${currentStreak}, maintenant 0)`);
        currentStreak = 0;
      }
    }
    
    // Utiliser la série actuelle (currentStreak) au lieu de la meilleure série historique
    // Cela permet à la barre de progression de retomber à 0 si le joueur perd un match
    current = currentStreak;
    console.log(`[Challenge ${record.id}] Consecutive wins: current streak = ${currentStreak}/${target}`);
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
    console.log(`[Challenge ${record.id}] Different partners found:`, Array.from(uniquePartners).map(id => id.substring(0, 8)));
    console.log(`[Challenge ${record.id}] Counting ${metricIsWin ? 'wins only' : 'all matches'} with different partners`);
  } else if (metricIsWin) {
    current = sortedRelevant.filter((item) => item.isWinner).length;
  } else {
    current = sortedRelevant.length;
  }

  console.log(`[Challenge ${record.id}] Result: ${current}/${target} (${sortedRelevant.length} relevant matches, ${isConsecutiveWins ? 'consecutive wins' : isDifferentPartners ? 'counting unique partners' : metricIsWin ? 'counting wins only' : 'counting all'})`);

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
  console.log(`[api/player/challenges] Resolved clubId for user ${userIdPreview}:`, clubId);
  if (!clubId) {
    console.warn(`[api/player/challenges] No clubId found for user ${userIdPreview}, returning empty challenges`);
    return NextResponse.json({ challenges: [] });
  }

  const records = await loadChallenges(clubId);
  console.log(`[api/player/challenges] Loaded ${records.length} challenges for club ${clubId}`);
  if (records.length > 0) {
    console.log(`[Player ${userIdPreview}] Challenges:`, records.map(r => ({
      id: r.id.substring(0, 8),
      title: r.title,
      start_date: r.start_date,
      end_date: r.end_date,
      objective: r.objective
    })));
  }
  
  if (records.length === 0) {
    return NextResponse.json({ challenges: [] });
  }

  console.log(`[api/player/challenges] About to load player history for user ${userIdPreview}`);
  const history = await loadPlayerHistory(user.id);
  console.log(`[api/player/challenges] Player ${userIdPreview} - Loaded ${history.length} matches from history`);
  
  if (history.length > 0) {
    console.log(`[api/player/challenges] Recent matches:`, history.slice(-5).map(h => ({
      matchId: h.matchId.substring(0, 8),
      playedAt: h.playedAt,
      isWinner: h.isWinner
    })));
  } else {
    console.warn(`[api/player/challenges] ⚠️ NO MATCHES FOUND for user ${userIdPreview} - this will cause progress to be 0`);
  }

  // Récupérer les récompenses déjà réclamées
  let claimedSet = new Set<string>();
  try {
    const { data: claimedRewards, error: rewardsError } = await supabaseAdmin!
      .from("challenge_rewards")
      .select("challenge_id")
      .eq("user_id", user.id);
    
    if (rewardsError) {
      console.warn("[api/player/challenges] ⚠️ Could not fetch rewards (table may not exist yet):", rewardsError.message);
    } else {
      claimedSet = new Set(claimedRewards?.map(r => r.challenge_id) || []);
    }
  } catch (err) {
    console.warn("[api/player/challenges] ⚠️ Exception fetching rewards:", err);
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 jour = 24h

  const challenges: ChallengeResponse[] = records
    .filter((record) => {
      // Filtrer les challenges expirés depuis plus d'1 jour
      const endDate = new Date(record.end_date);
      const isExpiredMoreThanOneDay = endDate < oneDayAgo;
      
      if (isExpiredMoreThanOneDay) {
        console.log(`[Challenge ${record.id.substring(0, 8)}] Filtered out - expired more than 1 day ago (end: ${record.end_date})`);
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
