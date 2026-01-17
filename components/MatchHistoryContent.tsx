import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Link from "next/link";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import PendingMatchesSection from "@/components/PendingMatchesSection";
import { logger } from '@/lib/logger';

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

export default async function MatchHistoryContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 font-normal">
        <p>Vous devez être connecté pour consulter l'historique des matchs.</p>
        <Link href="/login" className="text-blue-400 underline mt-2 inline-block">Se connecter</Link>
      </div>
    );
  }

  // Récupérer le club_id de l'utilisateur
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("club_id")
    .eq("id", user.id)
    .maybeSingle();

  let userClubId = userProfile?.club_id || null;

  if (!userClubId) {
    try {
      const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
        .from("profiles")
        .select("club_id")
        .eq("id", user.id)
        .maybeSingle();
      if (adminProfileError) {
        logger.error("[MatchHistory] Failed to fetch profile via admin client", {
          message: adminProfileError.message,
          details: adminProfileError.details,
          hint: adminProfileError.hint,
          code: adminProfileError.code,
        });
      }
      if (adminProfile?.club_id) {
        userClubId = adminProfile.club_id;
      }
    } catch (e) {
      logger.error("[MatchHistory] Unexpected error when fetching profile via admin client", e);
    }
  }

  if (!userClubId) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-sm text-white/70 font-normal">
        <p>Vous devez être rattaché à un club pour consulter l'historique des matchs. Contactez votre club / complexe pour obtenir le code d'invitation.</p>
      </div>
    );
  }

  // Récupérer tous les match_ids du joueur (uniquement les matchs où il est un user, pas guest)
  const { data: userParticipations, error: partError } = await supabase
    .from("match_participants")
    .select("match_id, team")
    .eq("user_id", user.id)
    .eq("player_type", "user");

  logger.info("[MatchHistory] User participations:", userParticipations, "Error:", partError);

  if (partError) {
    logger.error("Error fetching participations:", partError);
  }

  if (!userParticipations || userParticipations.length === 0) {
    return (
      <div className="rounded-2xl bg-white/10 border border-white/20 p-8 text-center backdrop-blur">
        <p className="text-white/80">Aucun match enregistré pour le moment.</p>
        <Link href="/match/new?tab=record" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          Enregistrer un match
        </Link>
      </div>
    );
  }

  // Récupérer tous les matchs correspondants (on filtrera après par club)
  const matchIds = userParticipations.map((p: any) => p.match_id);

  logger.info("[MatchHistory] Match IDs to fetch:", matchIds);

  if (matchIds.length === 0) {
    return (
      <div className="rounded-2xl bg-white/10 border border-white/20 p-8 text-center backdrop-blur">
        <p className="text-white/80">Aucun match enregistré pour le moment.</p>
        <Link href="/match/new?tab=record" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          Enregistrer un match
        </Link>
      </div>
    );
  }

  // Récupérer tous les matchs correspondants (on filtrera après par club)
  // NOUVEAU: Filtrer uniquement les matchs confirmés
  const { data: allMatches, error: matchesError } = await supabase
    .from("matches")
    .select("id, winner_team_id, team1_id, team2_id, score_team1, score_team2, created_at, decided_by_tiebreak, status")
    .in("id", matchIds)
    .or("status.eq.confirmed,status.is.null") // Matchs confirmés OU anciens matchs sans statut
    .order("created_at", { ascending: false });

  // Transformer les données pour générer winner_team et score formaté
  const transformedMatches = (allMatches || []).map((match: any) => {
    const winner_team = match.winner_team_id === match.team1_id ? 1 : 2;
    const score = `${match.score_team1 || 0}-${match.score_team2 || 0}`;
    return {
      ...match,
      winner_team,
      score
    };
  });

  logger.info("[MatchHistory] All matches fetched:", allMatches, "Error:", matchesError);

  if (matchesError) {
    logger.error("Error fetching matches:", matchesError);
  }

  if (!transformedMatches || transformedMatches.length === 0) {
    return (
      <div className="rounded-2xl bg-white/10 border border-white/20 p-8 text-center backdrop-blur">
        <p className="text-white/80">Aucun match enregistré pour le moment.</p>
        <Link href="/match/new?tab=record" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          Enregistrer un match
        </Link>
      </div>
    );
  }

  // Récupérer les détails de tous les participants pour chaque match
  logger.info("[MatchHistory] Fetching participants for match IDs:", matchIds);

  const { data: participantsSimple, error: simpleError } = await supabase
    .from("match_participants")
    .select("match_id, user_id, player_type, guest_player_id, team")
    .in("match_id", matchIds);

  if (simpleError) {
    logger.error("❌ Error fetching participants:", simpleError);
  }

  let allParticipants: any[] = participantsSimple || [];
  let participantsByMatch: Record<string, any[]> = {};
  let validMatchIds: Set<string> = new Set();
  logger.info("[MatchHistory] Participants fetched (base):", allParticipants.length);

  // Enrichir avec les noms des joueurs
  if (allParticipants.length > 0) {
    const userIds = [...new Set(allParticipants.filter(p => p.player_type === "user" && p.user_id).map(p => p.user_id))];
    const guestIds = [...new Set(allParticipants.filter(p => p.player_type === "guest" && p.guest_player_id).map(p => p.guest_player_id))];

    logger.info("[MatchHistory] Enriching with names - User IDs:", userIds.length, "Guest IDs:", guestIds.length);

    const profilesMap = new Map<string, string>();
    if (userIds.length > 0) {
      let profilesQuery = supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      if (userClubId) {
        profilesQuery = profilesQuery.eq("club_id", userClubId);
      }

      const { data: profiles, error: profilesError } = await profilesQuery;

      if (profilesError) {
        logger.error("❌ Error fetching profiles:", profilesError);
      } else if (profiles) {
        profiles.forEach(p => {
          profilesMap.set(p.id, p.display_name);
        });
        logger.info("[MatchHistory] Profiles loaded:", profiles.length);
      }
    }

    const guestsMap = new Map<string, { first_name: string; last_name: string }>();
    if (guestIds.length > 0) {
      const { data: guests, error: guestsError } = await supabase
        .from("guest_players")
        .select("id, first_name, last_name")
        .in("id", guestIds);

      if (guestsError) {
        logger.error("❌ Error fetching guest players:", guestsError);
      } else if (guests) {
        guests.forEach(g => guestsMap.set(g.id, { first_name: g.first_name, last_name: g.last_name }));
        logger.info("[MatchHistory] Guest players loaded:", guests.length);
      }
    }

    const validUserIds = new Set(profilesMap.keys());

    const filteredParticipants = userClubId
      ? allParticipants.filter((p: any) => {
        if (p.player_type === "user" && p.user_id) {
          return validUserIds.has(p.user_id);
        }
        return p.player_type === "guest";
      })
      : allParticipants;

    logger.info("[MatchHistory] Participants after club filtering:", filteredParticipants.length);

    const participantsByMatchTemp = filteredParticipants.reduce((acc: Record<string, any[]>, p: any) => {
      if (!acc[p.match_id]) {
        acc[p.match_id] = [];
      }
      acc[p.match_id].push(p);
      return acc;
    }, {});

    const validMatchIds = new Set<string>();
    Object.entries(participantsByMatchTemp).forEach(([matchId, participants]: [string, any[]]) => {
      const userParticipants = participants.filter((p: any) => p.player_type === "user" && p.user_id);
      const allUsersInSameClub = userParticipants.every((p: any) => validUserIds.has(p.user_id));

      if (allUsersInSameClub) {
        validMatchIds.add(matchId);
      } else {
        logger.info(`[MatchHistory] Filtering out match ${matchId} - not all users in same club`);
      }
    });

    logger.info("[MatchHistory] Valid matches (all users in same club):", validMatchIds.size);

    const finalFilteredParticipants = filteredParticipants.filter((p: any) => validMatchIds.has(p.match_id));

    const enrichedParticipants = finalFilteredParticipants.map(p => {
      const enriched: any = { ...p };

      if (p.player_type === "user" && p.user_id) {
        const displayName = profilesMap.get(p.user_id);
        enriched.profiles = displayName ? { display_name: displayName } : null;
      } else if (p.player_type === "guest" && p.guest_player_id) {
        const guest = guestsMap.get(p.guest_player_id);
        enriched.guest_players = guest || null;
      }

      return enriched;
    });

    logger.info("[MatchHistory] Participants enriched:", enrichedParticipants.length);

    allParticipants = enrichedParticipants;

    participantsByMatch = enrichedParticipants.reduce((acc: Record<string, any[]>, participant: any) => {
      if (!acc[participant.match_id]) {
        acc[participant.match_id] = [];
      }
      acc[participant.match_id].push(participant);
      return acc;
    }, {});
  } else {
    participantsByMatch = allParticipants.reduce((acc: Record<string, any[]>, participant: any) => {
      if (!acc[participant.match_id]) {
        acc[participant.match_id] = [];
      }
      acc[participant.match_id].push(participant);
      return acc;
    }, {});
  }

  let validMatchIdsForDisplay: Set<string>;
  if (validMatchIds.size > 0 && userClubId) {
    validMatchIdsForDisplay = validMatchIds;
  } else {
    validMatchIdsForDisplay = new Set(transformedMatches.map((m: any) => m.id));
  }

  const finalMatches = transformedMatches.filter((match: any) => validMatchIdsForDisplay.has(match.id));

  logger.info("[MatchHistory] Final matches after filtering:", finalMatches.length);

  const userTeamByMatch: Record<string, number> = {};
  userParticipations.forEach((p: any) => {
    userTeamByMatch[p.match_id] = p.team;
  });

  let totalWins = 0;
  let totalLosses = 0;
  finalMatches.forEach((match: any) => {
    const userTeam = userTeamByMatch[match.id];
    const won = match.winner_team === userTeam;
    if (won) totalWins++;
    else totalLosses++;
  });

  return (
    <>
      {/* Section des matchs en attente de confirmation */}
      <PendingMatchesSection />

      {/* Liste des matchs confirmés */}
      <div className="space-y-4">
        {finalMatches.map((match: any) => {
          const participants = participantsByMatch[match.id] || [];
          const team1 = participants.filter((p: any) => p.team === 1);
          const team2 = participants.filter((p: any) => p.team === 2);
          const userTeam = userTeamByMatch[match.id];
          const won = match.winner_team === userTeam;
          const matchDate = new Date(match.created_at);
          const dateStr = matchDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
          const timeStr = matchDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

          return (
            <div
              key={match.id}
              className={`rounded-2xl border-2 p-6 transition-all ${won
                  ? "border-green-500 bg-green-50"
                  : "border-red-300 bg-red-50"
                }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl ${won ? "text-green-600" : "text-red-600"} flex items-center`}>
                    {won ? <BadgeIconDisplay icon="🏆" size={32} className="flex-shrink-0" /> : "❌"}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {won ? "Victoire" : "Défaite"}
                    </div>
                    <div className="text-xs text-gray-600 font-normal">
                      {dateStr} à {timeStr}
                    </div>
                    {match.decided_by_tiebreak && (
                      <div className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${won
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : "border-red-300 bg-red-50 text-red-700"
                        }`}>
                        <span>⚡</span>
                        <span>{won ? "Victoire au tie-break" : "Défaite au tie-break"}</span>
                      </div>
                    )}
                  </div>
                </div>
                {match.score && (
                  <div className="rounded-lg bg-white px-4 py-2 text-base font-bold text-gray-900 tabular-nums">
                    {match.score}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Équipe 1 */}
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-3 text-xs font-normal uppercase tracking-wide text-gray-600 flex items-center gap-1">Équipe 1 {match.winner_team === 1 && <BadgeIconDisplay icon="🏆" size={16} className="flex-shrink-0" />}</div>
                  <div className="divide-y divide-gray-100">
                    {team1.map((p: any) => {
                      const isGuest = p.player_type === "guest";
                      const displayName = isGuest && p.guest_players
                        ? `${p.guest_players.first_name} ${p.guest_players.last_name}`.trim()
                        : p.profiles?.display_name || "Joueur";
                      const isCurrentUser = !isGuest && p.user_id === user.id;

                      return (
                        <div key={isGuest ? `guest_${p.guest_player_id}` : p.user_id} className="flex items-center gap-2 py-1.5">
                          {isCurrentUser ? (
                            <>
                              <span className="text-sm font-semibold text-gray-900 tracking-tight">{displayName}</span>
                              <span className="rounded-full bg-blue-600/90 px-2 py-0.5 text-xs font-bold text-white shadow-sm">VOUS</span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-normal text-gray-900 tracking-tight">{displayName}</span>
                              {isGuest && <span className="rounded-full border border-gray-300/80 bg-gray-50 px-2 py-0.5 text-xs font-normal text-gray-600">Invité</span>}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Équipe 2 */}
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-3 text-xs font-normal uppercase tracking-wide text-gray-600 flex items-center gap-1">Équipe 2 {match.winner_team === 2 && <BadgeIconDisplay icon="🏆" size={16} className="flex-shrink-0" />}</div>
                  <div className="divide-y divide-gray-100">
                    {team2.map((p: any) => {
                      const isGuest = p.player_type === "guest";
                      const displayName = isGuest && p.guest_players
                        ? `${p.guest_players.first_name} ${p.guest_players.last_name}`.trim()
                        : p.profiles?.display_name || "Joueur";
                      const isCurrentUser = !isGuest && p.user_id === user.id;

                      return (
                        <div key={isGuest ? `guest_${p.guest_player_id}` : p.user_id} className="flex items-center gap-2 py-1.5">
                          {isCurrentUser ? (
                            <>
                              <span className="text-sm font-semibold text-gray-900 tracking-tight">{displayName}</span>
                              <span className="rounded-full bg-blue-600/90 px-2 py-0.5 text-xs font-bold text-white shadow-sm">VOUS</span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-normal text-gray-900 tracking-tight">{displayName}</span>
                              {isGuest && <span className="rounded-full border border-gray-300/80 bg-gray-50 px-2 py-0.5 text-xs font-normal text-gray-600">Invité</span>}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

