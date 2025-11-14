import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

const PUBLIC_INFO_BUCKET = "club-public-info";

type ClubOpeningHours = Record<string, { open: string | null; close: string | null; closed?: boolean }>;

export type ClubPublicExtras = {
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  number_of_courts: number | null;
  court_type: string | null;
  description: string | null;
  opening_hours: ClubOpeningHours | null;
};

export async function getClubPublicExtras(clubId: string): Promise<ClubPublicExtras> {
  if (!supabaseAdmin) {
    return {
      address: null,
      postal_code: null,
      city: null,
      phone: null,
      website: null,
      number_of_courts: null,
      court_type: null,
      description: null,
      opening_hours: null,
    };
  }

  try {
    const { data, error } = await supabaseAdmin.storage.from(PUBLIC_INFO_BUCKET).download(`${clubId}.json`);
    if (error || !data) {
      if (error && !error.message?.toLowerCase().includes("not found")) {
        console.warn("[club-utils] getClubPublicExtras storage error", error);
      }
      return {
        address: null,
        postal_code: null,
        city: null,
        phone: null,
        website: null,
        number_of_courts: null,
        court_type: null,
        description: null,
        opening_hours: null,
      };
    }
    const text = await data.text();
    const parsed = JSON.parse(text);
    return {
      address: typeof parsed?.address === "string" ? parsed.address : null,
      postal_code: typeof parsed?.postal_code === "string" ? parsed.postal_code : null,
      city: typeof parsed?.city === "string" ? parsed.city : null,
      phone: typeof parsed?.phone === "string" ? parsed.phone : null,
      website: typeof parsed?.website === "string" ? parsed.website : null,
      number_of_courts:
        typeof parsed?.number_of_courts === "number"
          ? parsed.number_of_courts
          : typeof parsed?.number_of_courts === "string" && parsed.number_of_courts.trim()
            ? (() => {
                const value = Number.parseInt(parsed.number_of_courts, 10);
                return Number.isNaN(value) ? null : value;
              })()
            : null,
      court_type: typeof parsed?.court_type === "string" ? parsed.court_type : null,
      description: typeof parsed?.description === "string" ? parsed.description : null,
      opening_hours: typeof parsed?.opening_hours === "object" ? parsed.opening_hours as ClubOpeningHours : null,
    };
  } catch (error) {
    console.warn("[club-utils] getClubPublicExtras unexpected error", error);
    return {
      address: null,
      postal_code: null,
      city: null,
      phone: null,
      website: null,
      number_of_courts: null,
      court_type: null,
      description: null,
      opening_hours: null,
    };
  }
}

export type ClubInfo = {
  clubId: string | null;
  clubSlug: string | null;
  userId: string | null;
  clubName: string | null;
  clubLogoUrl: string | null;
};

export type ClubMember = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string | null;
  wins: number;
  losses: number;
  matches: number;
  points: number;
  last_match_at: string | null;
};

export type ClubLeaderboardRow = {
  user_id: string;
  player_name: string;
  points: number;
  wins: number;
  losses: number;
  matches: number;
  last_match_at: string | null;
  rank: number;
};

export async function getUserClubInfo(): Promise<ClubInfo> {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error("[club-utils] getUserClubInfo: auth error", userError);
  }

  if (!user) {
    console.warn("[club-utils] getUserClubInfo: no authenticated user");
    return { clubId: null, clubSlug: null, userId: null, clubName: null, clubLogoUrl: null };
  }

  let clubId: string | null = null;
  let clubSlug: string | null = null;
  let clubName: string | null = null;
  let clubLogoUrl: string | null = null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("club_id, club_slug")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    clubId = profile.club_id ?? null;
    clubSlug = profile.club_slug ?? null;
  } else if (profileError) {
    console.warn("[club-utils] getUserClubInfo: profile fetch error (ignored)", {
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
      code: profileError.code,
    });
  }

  const metadata = user.user_metadata || {};

  if (!clubId && metadata?.club_id) {
    clubId = metadata.club_id as string;
  }
  if (!clubSlug && metadata?.club_slug) {
    clubSlug = metadata.club_slug as string;
  }
  if (metadata?.club_name) {
    clubName = metadata.club_name as string;
  }
  if (metadata?.club_logo_url) {
    clubLogoUrl = metadata.club_logo_url as string;
  }

  if (supabaseAdmin) {
    // Vérifier si l'utilisateur est un administrateur de club via club_admins
    if (!clubId) {
      const { data: clubAdminData, error: clubAdminError } = await supabaseAdmin
        .from("club_admins")
        .select("club_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (clubAdminData?.club_id) {
        clubId = clubAdminData.club_id;
        console.log("[club-utils] Found club via club_admins", { userId: user.id, clubId });
      } else if (clubAdminError) {
        console.warn("[club-utils] getUserClubInfo: club_admins lookup failed", clubAdminError.message ?? clubAdminError);
      }
    }

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from("profiles")
      .select("club_id, club_slug, clubs(name, logo_url)")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfile) {
      clubId = clubId ?? adminProfile.club_id ?? null;
      clubSlug = clubSlug ?? adminProfile.club_slug ?? null;
      if (adminProfile.clubs) {
        clubName = clubName ?? (adminProfile.clubs as any).name ?? null;
        clubLogoUrl = clubLogoUrl ?? (adminProfile.clubs as any).logo_url ?? null;
      }
    } else if (adminError) {
      console.warn("[club-utils] getUserClubInfo: admin profile lookup failed", adminError.message ?? adminError);
    }

    if ((!clubName || !clubLogoUrl) && (clubId || clubSlug)) {
      const query = supabaseAdmin
        .from("clubs")
        .select("id, name, logo_url")
        .limit(1);

      if (clubId) {
        query.eq("id", clubId);
      } else if (clubSlug) {
        query.eq("slug", clubSlug);
      }

      const { data: clubRecord } = await query.maybeSingle();
      if (clubRecord) {
        clubId = clubId ?? (clubRecord.id as string | null);
        clubName = clubName ?? (clubRecord.name as string | null);
        clubLogoUrl = clubLogoUrl ?? (clubRecord.logo_url as string | null);
      }
    }
  }

  console.log("[club-utils] getUserClubInfo", {
    userId: user.id,
    clubId,
    clubSlug,
    clubName,
  });

  return {
    clubId: clubId ?? null,
    clubSlug: clubSlug ?? null,
    userId: user.id,
    clubName: clubName ?? null,
    clubLogoUrl: clubLogoUrl ?? null,
  };
}

export async function getUserClubId(): Promise<string | null> {
  const { clubId } = await getUserClubInfo();
  return clubId;
}

export async function getClubDashboardData(clubId: string | null, clubSlug?: string | null): Promise<{ members: ClubMember[]; leaderboard: ClubLeaderboardRow[] }> {
  if (!clubId || !supabaseAdmin) {
    if (!supabaseAdmin) {
      console.warn("[getClubDashboardData] Supabase admin client not configured");
    }
    return { members: [], leaderboard: [] };
  }

  let resolvedSlug: string | null = clubSlug ?? null;
  if (!resolvedSlug) {
    const { data: clubRecord, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("slug")
      .eq("id", clubId)
      .maybeSingle();

    if (clubError) {
      console.warn("[getClubDashboardData] Unable to fetch club slug", clubError);
    }

    if (clubRecord?.slug) {
      resolvedSlug = clubRecord.slug;
    }
  }

  // Récupérer tous les administrateurs du club pour les exclure s'ils ne sont que des admins
  const { data: clubAdmins, error: adminsError } = await supabaseAdmin
    .from("club_admins")
    .select("user_id")
    .eq("club_id", clubId);

  if (adminsError) {
    console.warn("[getClubDashboardData] Failed to load club admins", adminsError);
  }

  const adminUserIds = new Set<string>(
    (clubAdmins || []).map((admin) => admin.user_id as string).filter(Boolean)
  );

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, first_name, last_name, email, created_at, club_id, club_slug")
    .or(
      resolvedSlug
        ? `club_id.eq.${clubId},club_slug.eq.${resolvedSlug}`
        : `club_id.eq.${clubId}`
    )
    .order("display_name", { ascending: true });

  if (profilesError) {
    console.error("[getClubDashboardData] Failed to load club members", profilesError);
    return { members: [], leaderboard: [] };
  }

  // Vérifier quels admins ont participé à des matchs (donc sont vraiment des joueurs)
  // Si un admin a participé à des matchs, il est aussi un joueur
  const adminUserIdsArray = Array.from(adminUserIds);
  let adminIdsWithMatches = new Set<string>();
  
  if (adminUserIdsArray.length > 0) {
    const { data: adminMatchParticipants } = await supabaseAdmin
      .from("match_participants")
      .select("user_id")
      .in("user_id", adminUserIdsArray)
      .eq("player_type", "user");

    adminIdsWithMatches = new Set<string>(
      (adminMatchParticipants || []).map((p) => p.user_id as string).filter(Boolean)
    );
  }

  // Filtrer : exclure les admins qui n'ont jamais joué de matchs (administrateurs uniquement)
  const filteredProfiles = (profiles || []).filter((profile) => {
    if (adminUserIds.has(profile.id)) {
      // Si c'est un admin, ne l'inclure que s'il a joué au moins un match
      return adminIdsWithMatches.has(profile.id);
    }
    // Si ce n'est pas un admin, l'inclure (c'est un joueur normal)
    return true;
  });

  const members = filteredProfiles.map((p) => ({
    id: p.id,
    display_name: p.display_name ?? null,
    first_name: p.first_name ?? null,
    last_name: p.last_name ?? null,
    email: p.email ?? null,
    created_at: p.created_at ?? null,
    wins: 0,
    losses: 0,
    matches: 0,
    points: 0,
    last_match_at: null as string | null,
  }));

  if (!members.length) {
    return { members, leaderboard: [] };
  }

  const memberIds = members.map((m) => m.id).filter(Boolean);
  const memberIdSet = new Set(memberIds);
  const memberStats = new Map<string, ClubMember>();
  members.forEach((member) => {
    memberStats.set(member.id, { ...member });
  });

  if (memberIds.length === 0) {
    return { members, leaderboard: [] };
  }

  const history = await getClubMatchHistory(clubId, resolvedSlug);

  if (history.matches.length === 0) {
    const leaderboardFallback = members.map((member, idx) => ({
      user_id: member.id,
      player_name:
        member.display_name ||
        `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() ||
        "Joueur",
      points: 0,
      wins: 0,
      losses: 0,
      matches: 0,
      last_match_at: null,
      rank: idx + 1,
    }));

    return { members, leaderboard: leaderboardFallback };
  }

  history.matches.forEach((match) => {
    const winnerTeam = match.winner_team;
    const matchDate = match.created_at;

    [match.team1, match.team2].forEach((teamPlayers, teamIndex) => {
      const teamNumber = (teamIndex + 1) as 1 | 2;
      teamPlayers.forEach((player) => {
        if (player.player_type !== "user" || !player.user_id || !player.isClubMember) {
          return;
        }

        const member = memberStats.get(player.user_id);
        if (!member) {
          return;
        }

        member.matches += 1;

        if (winnerTeam) {
          if (winnerTeam === teamNumber) {
            member.wins += 1;
          } else {
            member.losses += 1;
          }
        }

        if (matchDate) {
          if (!member.last_match_at || new Date(matchDate) > new Date(member.last_match_at)) {
            member.last_match_at = matchDate;
          }
        }
      });
    });
  });

  const { data: reviewsData } = await supabaseAdmin
    .from("reviews")
    .select("user_id")
    .in("user_id", memberIds);

  const reviewBonusIds = new Set<string>((reviewsData || []).map((r) => r.user_id));

  const leaderboard = Array.from(memberStats.values()).map((member) => {
    const basePoints = member.wins * 10 + member.losses * 3;
    const bonus = reviewBonusIds.has(member.id) ? 10 : 0;
    const points = basePoints + bonus;
    member.points = points;

    return {
      user_id: member.id,
      player_name:
        member.display_name ||
        `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() ||
        "Joueur",
      points,
      wins: member.wins,
      losses: member.losses,
      matches: member.matches,
      last_match_at: member.last_match_at,
      rank: 0,
    };
  });

  leaderboard.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.matches !== b.matches) return a.matches - b.matches;
    return a.player_name.localeCompare(b.player_name);
  });

  leaderboard.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  const membersWithStats = Array.from(memberStats.values()).map((member) => ({
    ...member,
  }));

  membersWithStats.sort((a, b) => {
    const leftName = a.display_name || `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim();
    const rightName = b.display_name || `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim();
    return leftName.localeCompare(rightName);
  });

  return {
    members: membersWithStats,
    leaderboard,
  };
}

export type ClubMatchParticipant = {
  player_type: "user" | "guest";
  user_id?: string;
  guest_player_id?: string;
  name: string;
  isClubMember: boolean;
  team: 1 | 2 | null;
};

export type ClubMatchHistoryItem = {
  id: string;
  created_at: string | null;
  score: string;
  winner_team: 1 | 2 | null;
  decided_by_tiebreak: boolean | null;
  team1: ClubMatchParticipant[];
  team2: ClubMatchParticipant[];
  clubTeam: 1 | 2 | null;
  result: "win" | "loss" | "internal" | "pending";
};

export type ClubMatchHistory = {
  matches: ClubMatchHistoryItem[];
  totalMatches: number;
  wins: number;
  losses: number;
  internalMatches: number;
};

export async function getClubMatchHistory(clubId: string | null, clubSlug?: string | null): Promise<ClubMatchHistory> {
  if (!clubId || !supabaseAdmin) {
    if (!supabaseAdmin) {
      console.warn("[getClubMatchHistory] Supabase admin client not configured");
    }
    return { matches: [], totalMatches: 0, wins: 0, losses: 0, internalMatches: 0 };
  }

  let resolvedSlug: string | null = clubSlug ?? null;
  if (!resolvedSlug) {
    const { data: clubRecord, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("slug")
      .eq("id", clubId)
      .maybeSingle();

    if (clubError) {
      console.warn("[getClubMatchHistory] Unable to fetch club slug", clubError);
    }

    if (clubRecord?.slug) {
      resolvedSlug = clubRecord.slug;
    }
  }

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, first_name, last_name, club_id, club_slug")
    .or(
      resolvedSlug
        ? `club_id.eq.${clubId},club_slug.eq.${resolvedSlug}`
        : `club_id.eq.${clubId}`
    );

  if (profilesError) {
    console.error("[getClubMatchHistory] Failed to load club members", profilesError);
    return { matches: [], totalMatches: 0, wins: 0, losses: 0, internalMatches: 0 };
  }

  const members = profiles || [];
  if (members.length === 0) {
    return { matches: [], totalMatches: 0, wins: 0, losses: 0, internalMatches: 0 };
  }

  const memberIds = members.map((m) => m.id).filter(Boolean);
  const memberIdSet = new Set(memberIds);

  const { data: clubParticipantsRaw, error: participantsError } = await supabaseAdmin
    .from("match_participants")
    .select("match_id, user_id, team")
    .eq("player_type", "user")
    .in("user_id", memberIds);

  if (participantsError) {
    console.warn("[getClubMatchHistory] Failed to load club participants", participantsError);
  }

  const clubParticipants = (clubParticipantsRaw || []).filter((p) => p.user_id && memberIdSet.has(p.user_id));
  const matchIds = [...new Set(clubParticipants.map((p) => p.match_id).filter(Boolean))];

  if (matchIds.length === 0) {
    return { matches: [], totalMatches: 0, wins: 0, losses: 0, internalMatches: 0 };
  }

  const { data: matchesData, error: matchesError } = await supabaseAdmin
    .from("matches")
    .select("id, winner_team_id, team1_id, team2_id, score_team1, score_team2, created_at, decided_by_tiebreak")
    .in("id", matchIds)
    .order("created_at", { ascending: false });

  if (matchesError) {
    console.error("[getClubMatchHistory] Failed to load matches", matchesError);
    return { matches: [], totalMatches: 0, wins: 0, losses: 0, internalMatches: 0 };
  }

  const matchesMap = new Map<string, any>();
  (matchesData || []).forEach((match) => {
    if (match?.id) {
      const winner_team = match.winner_team_id
        ? match.winner_team_id === match.team1_id
          ? 1
          : match.winner_team_id === match.team2_id
          ? 2
          : null
        : match.score_team1 != null && match.score_team2 != null && match.score_team1 !== match.score_team2
        ? match.score_team1 > match.score_team2
          ? 1
          : 2
        : null;
      const score = `${match.score_team1 ?? 0}-${match.score_team2 ?? 0}`;
      matchesMap.set(match.id, { ...match, winner_team, score });
    }
  });

  const { data: allParticipantsRaw, error: participantsDetailsError } = await supabaseAdmin
    .from("match_participants")
    .select("match_id, user_id, player_type, guest_player_id, team")
    .in("match_id", matchIds);

  if (participantsDetailsError) {
    console.error("[getClubMatchHistory] Failed to load all participants", participantsDetailsError);
    return { matches: [], totalMatches: 0, wins: 0, losses: 0, internalMatches: 0 };
  }

  const allParticipants = allParticipantsRaw || [];
  const userIds = [...new Set(allParticipants.filter((p) => p.player_type === "user" && p.user_id).map((p) => p.user_id as string))];
  const guestIds = [...new Set(allParticipants.filter((p) => p.player_type === "guest" && p.guest_player_id).map((p) => p.guest_player_id as string))];

  const profilesMap = new Map<string, { display_name: string | null; first_name: string | null; last_name: string | null }>();
  if (userIds.length > 0) {
    const { data: participantProfiles, error: participantProfilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, first_name, last_name")
      .in("id", userIds);

    if (participantProfilesError) {
      console.error("[getClubMatchHistory] Failed to load participant profiles", participantProfilesError);
    } else {
      (participantProfiles || []).forEach((profile) => {
        profilesMap.set(profile.id, {
          display_name: profile.display_name ?? null,
          first_name: profile.first_name ?? null,
          last_name: profile.last_name ?? null,
        });
      });
    }
  }

  const guestsMap = new Map<string, { first_name: string | null; last_name: string | null }>();
  if (guestIds.length > 0) {
    const { data: guestProfiles, error: guestProfilesError } = await supabaseAdmin
      .from("guest_players")
      .select("id, first_name, last_name")
      .in("id", guestIds);

    if (guestProfilesError) {
      console.error("[getClubMatchHistory] Failed to load guest players", guestProfilesError);
    } else {
      (guestProfiles || []).forEach((guest) => {
        guestsMap.set(guest.id, {
          first_name: guest.first_name ?? null,
          last_name: guest.last_name ?? null,
        });
      });
    }
  }

  const participantsByMatch = new Map<string, ClubMatchParticipant[]>();
  allParticipants.forEach((participant) => {
    const matchId = participant.match_id;
    if (!matchId) return;

    let name = "Joueur";
    let isClubMember = false;

    if (participant.player_type === "user" && participant.user_id) {
      const profile = profilesMap.get(participant.user_id) || null;
      if (profile) {
        name = profile.display_name || `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Joueur";
      }
      isClubMember = memberIdSet.has(participant.user_id);
    } else if (participant.player_type === "guest" && participant.guest_player_id) {
      const guest = guestsMap.get(participant.guest_player_id) || null;
      if (guest) {
        name = `${guest.first_name ?? ""} ${guest.last_name ?? ""}`.trim() || "Invité";
      } else {
        name = "Invité";
      }
    }

    if (!participantsByMatch.has(matchId)) {
      participantsByMatch.set(matchId, []);
    }

    const teamValue = typeof participant.team === "number" ? participant.team : null;
    const teamNormalized: 1 | 2 | null = teamValue === 1 ? 1 : teamValue === 2 ? 2 : null;

    participantsByMatch.get(matchId)!.push({
      player_type: participant.player_type as "user" | "guest",
      user_id: participant.user_id ?? undefined,
      guest_player_id: participant.guest_player_id ?? undefined,
      name,
      isClubMember,
      team: teamNormalized,
    });
  });

  const matches: ClubMatchHistoryItem[] = [];
  let wins = 0;
  let losses = 0;
  let internalMatches = 0;

  (matchesData || []).forEach((match) => {
    if (!match?.id) return;
    const enriched = matchesMap.get(match.id);
    if (!enriched) return;

    const participants = participantsByMatch.get(match.id) || [];
    const team1 = participants.filter((p) => p.team === 1);
    const team2 = participants.filter((p) => p.team === 2);

    const clubTeam1Count = team1.filter((p) => p.isClubMember).length;
    const clubTeam2Count = team2.filter((p) => p.isClubMember).length;

    let clubTeam: 1 | 2 | null = null;
    if (clubTeam1Count > 0 && clubTeam2Count === 0) {
      clubTeam = 1;
    } else if (clubTeam2Count > 0 && clubTeam1Count === 0) {
      clubTeam = 2;
    } else if (clubTeam1Count > 0 && clubTeam2Count > 0) {
      clubTeam = null; // match interne
    }

    let result: "win" | "loss" | "internal" | "pending" = "pending";
    if (clubTeam === null) {
      result = "internal";
      internalMatches += 1;
    } else if (!enriched.winner_team) {
      result = "pending";
    } else if (enriched.winner_team === clubTeam) {
      result = "win";
      wins += 1;
    } else {
      result = "loss";
      losses += 1;
    }

    matches.push({
      id: match.id,
      created_at: enriched.created_at ?? null,
      score: enriched.score,
      winner_team: enriched.winner_team,
      decided_by_tiebreak: match.decided_by_tiebreak ?? null,
      team1,
      team2,
      clubTeam,
      result,
    });
  });

  return {
    matches,
    totalMatches: matches.length,
    wins,
    losses,
    internalMatches,
  };
}

