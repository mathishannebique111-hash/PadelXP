import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Link from "next/link";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import PendingMatchesSection from "@/components/PendingMatchesSection";
import { logger } from '@/lib/logger';
import { Trophy, Check, X, MapPin } from "lucide-react";

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

  // Récupérer tous les match_ids du joueur (uniquement les matchs où il est un user, pas guest)
  const { data: userParticipations, error: partError } = await supabase
    .from("match_participants")
    .select("match_id, team")
    .eq("user_id", user.id)
    .eq("player_type", "user");

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

  const matchIds = userParticipations.map((p: any) => p.match_id);

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

  const { data: allMatches, error: matchesError } = await supabase
    .from("matches")
    .select("id, winner_team_id, team1_id, team2_id, score_team1, score_team2, score_details, created_at, played_at, decided_by_tiebreak, status, location_club_id, is_registered_club")
    .in("id", matchIds)
    .or("status.eq.confirmed,status.is.null")
    .order("created_at", { ascending: false });

  const transformedMatches = (allMatches || []).map((match: any) => {
    const winner_team = match.winner_team_id === match.team1_id ? 1 : 2;
    const score = `${match.score_team1 || 0}-${match.score_team2 || 0}`;
    return {
      ...match,
      winner_team,
      score
    };
  });

  if (matchesError) {
    logger.error("Error fetching matches:", matchesError);
  }

  const { data: participantsSimple, error: simpleError } = await supabase
    .from("match_participants")
    .select("match_id, user_id, player_type, guest_player_id, team")
    .in("match_id", matchIds);

  if (simpleError) {
    logger.error("❌ Error fetching participants:", simpleError);
  }

  let allParticipants: any[] = participantsSimple || [];
  let participantsByMatch: Record<string, any[]> = {};

  if (allParticipants.length > 0) {
    const userIds = [...new Set(allParticipants.map(p => p.user_id).filter(Boolean))];
    const guestIds = [...new Set(allParticipants.map(p => p.guest_player_id).filter(Boolean))];

    const profilesMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      if (profiles && !profilesError) {
        profiles.forEach(p => profilesMap.set(p.id, p.display_name));
      }
    }

    const guestsMap = new Map<string, { first_name: string; last_name: string }>();
    if (guestIds.length > 0) {
      const { data: guests, error: guestsError } = await supabaseAdmin
        .from("guest_players")
        .select("id, first_name, last_name")
        .in("id", guestIds);

      if (guests && !guestsError) {
        guests.forEach(g => guestsMap.set(g.id, { first_name: g.first_name, last_name: g.last_name }));
      }
    }

    allParticipants = allParticipants.map(p => {
      const enriched: any = { ...p };
      if (p.user_id) {
        const displayName = profilesMap.get(p.user_id);
        enriched.profiles = displayName ? { display_name: displayName } : null;
      }
      if (p.guest_player_id) {
        const guest = guestsMap.get(p.guest_player_id);
        enriched.guest_players = guest || null;
      }
      return enriched;
    });

    participantsByMatch = allParticipants.reduce((acc: Record<string, any[]>, participant: any) => {
      if (!acc[participant.match_id]) acc[participant.match_id] = [];
      acc[participant.match_id].push(participant);
      return acc;
    }, {});
  }

  const finalMatches = transformedMatches;

  const clubIds = [...new Set(finalMatches.filter((m: any) => m.location_club_id && m.is_registered_club).map((m: any) => m.location_club_id))];
  const unregClubIds = [...new Set(finalMatches.filter((m: any) => m.location_club_id && !m.is_registered_club).map((m: any) => m.location_club_id))];

  const locationNamesMap = new Map<string, string>();

  if (clubIds.length > 0) {
    const { data: registeredClubs } = await supabaseAdmin
      .from("clubs")
      .select("id, name, city")
      .in("id", clubIds);
    (registeredClubs || []).forEach(c => locationNamesMap.set(c.id, `${c.name} (${c.city})`));
  }

  if (unregClubIds.length > 0) {
    const { data: unregisteredClubs } = await supabaseAdmin
      .from("unregistered_clubs")
      .select("id, name, city")
      .in("id", unregClubIds);
    (unregisteredClubs || []).forEach(c => locationNamesMap.set(c.id, `${c.name} (${c.city})`));
  }

  const userTeamByMatch: Record<string, number> = {};
  userParticipations.forEach((p: any) => {
    userTeamByMatch[p.match_id] = p.team;
  });

  return (
    <>
      <PendingMatchesSection />

      <div className="space-y-4">
        {finalMatches.map((match: any) => {
          const participants = participantsByMatch[match.id] || [];
          const team1 = participants.filter((p: any) => p.team === 1);
          const team2 = participants.filter((p: any) => p.team === 2);
          const userTeam = userTeamByMatch[match.id];
          const won = match.winner_team === userTeam;
          const matchDate = new Date(match.played_at || match.created_at);
          const dateStr = matchDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
          const timeStr = matchDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

          return (
            <div
              key={match.id}
              className={`rounded-2xl border-2 p-3 transition-all ${won
                ? "border-green-300 bg-green-50"
                : "border-red-300 bg-red-50"
                }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl flex items-center`}>
                    {won ? <Check size={24} className="text-green-600 flex-shrink-0" /> : <X size={24} className="text-red-500 flex-shrink-0" />}
                  </span>
                  <div>
                    <div className={`text-sm font-semibold text-[#071554]`}>
                      {won ? "Victoire" : "Défaite"}
                    </div>
                    <div className={`text-xs font-normal text-[#071554]/70`}>
                      {dateStr} à {timeStr}
                    </div>
                    {match.location_club_id && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#071554]/60">
                        <MapPin className="h-3 w-3 opacity-70" />
                        <span className="truncate max-w-[150px] text-ellipsis">{locationNamesMap.get(match.location_club_id) || "Lieu inconnu"}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Score des sets en haut à droite */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-gray-100 shadow-sm">
                  <span className="text-sm font-bold text-gray-900 tabular-nums">
                    {match.score_team1}-{match.score_team2}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Équipe 1 */}
                <div className="rounded-lg border border-gray-100 bg-white p-2">
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1">
                    Équipe 1 {match.winner_team === 1 && <Trophy size={12} className="text-amber-500" />}
                  </div>
                  <div className="space-y-1">
                    {team1.map((p: any) => {
                      const isGuest = p.player_type === "guest";
                      let displayName = "Joueur";
                      if (isGuest) {
                        if (p.guest_players) {
                          displayName = `${p.guest_players.first_name || ''} ${p.guest_players.last_name || ''}`.trim() || "Joueur invité";
                        } else if (p.profiles) {
                          displayName = p.profiles.display_name || "Joueur invité";
                        } else {
                          displayName = "Joueur anonyme";
                        }
                      } else if (p.profiles) {
                        displayName = p.profiles.display_name || "Joueur";
                      }
                      const isCurrentUser = !isGuest && p.user_id === user.id;

                      return (
                        <div key={isGuest ? `guest_${p.guest_player_id}` : p.user_id} className="flex items-center justify-between">
                          <span className={`text-[11px] truncate max-w-[85%] ${isCurrentUser ? "font-bold text-[#071554]" : "font-medium text-gray-700"}`}>
                            {displayName}
                          </span>
                          {isCurrentUser && <span className="text-[8px] bg-padel-green px-1 rounded-full font-black text-[#071554]">MOI</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Équipe 2 */}
                <div className="rounded-lg border border-gray-100 bg-white p-2">
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1">
                    Équipe 2 {match.winner_team === 2 && <Trophy size={12} className="text-amber-500" />}
                  </div>
                  <div className="space-y-1">
                    {team2.map((p: any) => {
                      const isGuest = p.player_type === "guest";
                      let displayName = "Joueur";
                      if (isGuest) {
                        if (p.guest_players) {
                          displayName = `${p.guest_players.first_name || ''} ${p.guest_players.last_name || ''}`.trim() || "Joueur invité";
                        } else if (p.profiles) {
                          displayName = p.profiles.display_name || "Joueur invité";
                        } else {
                          displayName = "Joueur anonyme";
                        }
                      } else if (p.profiles) {
                        displayName = p.profiles.display_name || "Joueur";
                      }
                      const isCurrentUser = !isGuest && p.user_id === user.id;

                      return (
                        <div key={isGuest ? `guest_${p.guest_player_id}` : p.user_id} className="flex items-center justify-between">
                          <span className={`text-[11px] truncate max-w-[85%] ${isCurrentUser ? "font-bold text-[#071554]" : "font-medium text-gray-700"}`}>
                            {displayName}
                          </span>
                          {isCurrentUser && <span className="text-[8px] bg-padel-green px-1 rounded-full font-black text-[#071554]">MOI</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Score détaillé centré dessous */}
              {match.score_details && (
                <div className="mt-3 flex justify-center">
                  <div className="inline-flex items-center px-4 py-1 rounded-lg bg-[#071554]/5 border border-[#071554]/10">
                    <span className="text-sm font-bold text-[#071554] tabular-nums">
                      {match.score_details}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
