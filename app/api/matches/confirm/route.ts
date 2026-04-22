import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token requis" }, { status: 400 });
    }

    // Créer client admin car on accède aux confirmations via token (hors session potentiellement)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Récupérer la confirmation via le token
    const { data: confirmation, error: confError } = await adminClient
      .from("match_confirmations")
      .select("match_id, confirmed")
      .eq("confirmation_token", token)
      .maybeSingle();

    if (confError || !confirmation) {
      return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 404 });
    }

    if (confirmation.confirmed) {
      return NextResponse.json({
        success: true,
        alreadyConfirmed: true,
        status: 'confirmed'
      });
    }

    // 2. Récupérer les détails du match et du lieu
    const { data: match, error: matchError } = await adminClient
      .from("matches")
      .select(`
        id,
        played_at,
        score_team1,
        score_team2,
        location_club_id,
        is_registered_club,
        status
      `)
      .eq("id", confirmation.match_id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match non trouvé" }, { status: 404 });
    }

    // 3. Récupérer le nom du lieu
    let locationName = "Lieu non précisé";
    if (match.location_club_id) {
      if (match.is_registered_club) {
        const { data: club } = await adminClient
          .from("clubs")
          .select("name, city")
          .eq("id", match.location_club_id)
          .maybeSingle();
        if (club) locationName = `${club.name} (${club.city})`;
      } else {
        const { data: unregClub } = await adminClient
          .from("unregistered_clubs")
          .select("name, city")
          .eq("id", match.location_club_id)
          .maybeSingle();
        if (unregClub) locationName = `${unregClub.name} (${unregClub.city})`;
      }
    }

    // 4. Récupérer les participants pour afficher le "contexte" (qui joue)
    const { data: participants } = await adminClient
      .from("match_participants")
      .select("user_id, player_type, guest_player_id, team")
      .eq("match_id", match.id);

    // Récupérer les noms des participants (simplifié pour le contexte)
    const userIds = (participants || []).filter(p => p.player_type === 'user').map(p => p.user_id);
    const { data: profiles } = await adminClient.from("profiles").select("id, display_name").in("id", userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p.display_name]));

    const enrichedParticipants = (participants || []).map(p => ({
      team: p.team,
      name: p.player_type === 'user' ? (profileMap.get(p.user_id) || 'Joueur') : 'Invité'
    }));

    return NextResponse.json({
      success: true,
      match: {
        id: match.id,
        played_at: match.played_at,
        score: `${match.score_team1}-${match.score_team2}`,
        locationName,
        participants: enrichedParticipants
      }
    });

  } catch (error) {
    logger.error("GET /api/matches/confirm - Unexpected error", { error: (error as Error).message });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    logger.info("POST /api/matches/confirm - Starting");

    const body = await req.json();
    const { matchId } = body as { matchId?: string };

    logger.info("POST /api/matches/confirm - Body parsed", { matchId });

    if (!matchId) {
      return NextResponse.json({ error: "matchId requis" }, { status: 400 });
    }

    // Get cookies and create auth client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // Ignore cookie setting errors
            }
          },
        },
      }
    );

    logger.info("POST /api/matches/confirm - Getting user");
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      logger.error("POST /api/matches/confirm - User error", { error: userError.message });
      return NextResponse.json({ error: "Erreur d'authentification", details: userError.message }, { status: 401 });
    }

    if (!user) {
      logger.error("POST /api/matches/confirm - No user");
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    logger.info("POST /api/matches/confirm - User found", { userId: user.id.substring(0, 8) + "…" });

    // Create admin client
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if match exists
    logger.info("POST /api/matches/confirm - Checking match exists");
    const { data: match, error: matchError } = await adminClient
      .from("matches")
      .select("id, status")
      .eq("id", matchId)
      .maybeSingle();

    if (matchError) {
      logger.error("POST /api/matches/confirm - Match query error", { error: matchError.message });
      return NextResponse.json({ error: "Erreur lors de la recherche du match", details: matchError.message }, { status: 500 });
    }

    if (!match) {
      logger.error("POST /api/matches/confirm - Match not found");
      return NextResponse.json({ error: "Match non trouvé" }, { status: 404 });
    }

    logger.info("POST /api/matches/confirm - Match found", { status: match.status });

    if (match.status === 'confirmed') {
      return NextResponse.json({
        success: true,
        message: "Ce match est déjà confirmé",
        alreadyConfirmed: true
      });
    }

    // Upsert the confirmation
    logger.info("POST /api/matches/confirm - handling confirmation (check existing first)");

    // On vérifie d'abord si une confirmation existe déjà pour cet utilisateur
    // Cela évite les problèmes avec upsert sur un index partiel (Postgres ne trouve pas toujours l'index partial pour l'inférence ON CONFLICT)
    const { data: existingConfirmation, error: checkError } = await adminClient
      .from("match_confirmations")
      .select("id")
      .eq("match_id", matchId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (checkError) {
      logger.error("POST /api/matches/confirm - Check existing error", { error: checkError.message });
      return NextResponse.json({ error: "Erreur lors de la vérification", details: checkError.message }, { status: 500 });
    }

    let actionError = null;

    if (existingConfirmation) {
      // Update
      const { error: updateError } = await adminClient
        .from("match_confirmations")
        .update({
          confirmed: true,
          confirmed_at: new Date().toISOString(),
          // On ne change pas le token s'il existe déjà, sauf si on veut le forcer ?
          // Gardons le token existant ou générons-en un nouveau ?
          // Dans le doute, on update tout pour être iso avec l'ancien upsert
          confirmation_token: crypto.randomUUID()
        })
        .eq("id", existingConfirmation.id);
      actionError = updateError;
    } else {
      // Insert
      const { error: insertError } = await adminClient
        .from("match_confirmations")
        .insert({
          match_id: matchId,
          user_id: user.id,
          confirmed: true,
          confirmed_at: new Date().toISOString(),
          confirmation_token: crypto.randomUUID()
        });
      actionError = insertError;
    }

    if (actionError) {
      logger.error("POST /api/matches/confirm - Action error", { error: actionError.message });
      return NextResponse.json({ error: "Erreur lors de la confirmation", details: actionError.message }, { status: 500 });
    }

    logger.info("POST /api/matches/confirm - Confirmation upserted");

    // === DEBRIEF NOTIFICATION (envoyée dès que le joueur confirme, pas besoin d'attendre les 2 équipes) ===
    try {
      const { createServerNotification } = await import("@/lib/notifications/send-push");

      // Récupérer le prénom du joueur
      const { data: confirmingProfile } = await adminClient
        .from("profiles")
        .select("first_name, display_name")
        .eq("id", user.id)
        .single();

      const playerFirstName = confirmingProfile?.first_name
        || (confirmingProfile?.display_name ? confirmingProfile.display_name.split(/\s+/)[0] : "Joueur");

      await createServerNotification(
        user.id,
        "coach_debrief",
        "Ton debrief post-match est prêt",
        `${playerFirstName}, 30 secondes pour améliorer ton prochain match`,
        { type: "coach_debrief", match_id: matchId, path: "/coach" }
      );

      logger.info("Debrief notification sent to confirming user", { userId: user.id });
    } catch (debriefNotifError) {
      logger.error("Debrief notification error (non-blocking)", {
        error: (debriefNotifError as Error).message,
      });
    }

    // Count confirmations
    const { data: confirmations } = await adminClient
      .from("match_confirmations")
      .select("id, user_id, guest_player_id")
      .eq("match_id", matchId)
      .eq("confirmed", true);

    const confirmationCount = confirmations?.length || 0;
    logger.info("POST /api/matches/confirm - Confirmation count", { count: confirmationCount });

    // Vérifier si chaque équipe a au moins 1 confirmation
    const { data: participants } = await adminClient
      .from("match_participants")
      .select("user_id, guest_player_id, team")
      .eq("match_id", matchId);

    const confirmedUserIds = new Set((confirmations || []).map(c => c.user_id).filter(Boolean));
    const confirmedGuestIds = new Set((confirmations || []).map(c => c.guest_player_id).filter(Boolean));

    const team1Confirmed = (participants || []).some(p =>
      p.team === 1 && (confirmedUserIds.has(p.user_id) || confirmedGuestIds.has(p.guest_player_id))
    );
    const team2Confirmed = (participants || []).some(p =>
      p.team === 2 && (confirmedUserIds.has(p.user_id) || confirmedGuestIds.has(p.guest_player_id))
    );

    // Fetch the updated match status (the trigger might have already confirmed it)
    const { data: updatedMatch } = await adminClient
      .from("matches")
      .select("status")
      .eq("id", matchId)
      .maybeSingle();

    const isConfirmed = updatedMatch?.status === 'confirmed';
    logger.info("POST /api/matches/confirm - Match confirmation check", {
      isConfirmed,
      matchStatus: updatedMatch?.status,
      team1Confirmed,
      team2Confirmed,
      confirmationCount,
    });

    if (isConfirmed) {
      // PHASE 5: DISTRIBUTION DES POINTS (Global & Club)
      // On le fait ici pour être sûr que ça ne tourne qu'une fois (quand status passe à confirmed)
      // et pour gérer la logique complexe (boosts, multi-club) plus facilement qu'en SQL.
      try {
        logger.info("Match verified confirmed, distributing points...");

        // 1. Récupérer les détails complets du match et des participants
        const { data: fullMatch } = await adminClient
          .from("matches")
          .select("id, winner_team_id, team1_id, team2_id, location_club_id, league_id")
          .eq("id", matchId)
          .single();

        const { data: participants } = await adminClient
          .from("match_participants")
          .select("user_id, team, player_type")
          .eq("match_id", matchId)
          .eq("player_type", "user");

        if (fullMatch && participants && participants.length > 0) {
          const winnerTeamId = fullMatch.winner_team_id;
          const matchLocationClubId = fullMatch.location_club_id;

          // Import dynamique pour éviter les cycles ou problèmes de chargement
          const { calculatePointsWithBoosts } = await import("@/lib/utils/boost-points-utils");

          // Pour chaque joueur
          for (const participant of participants) {
            const userId = participant.user_id;
            // Déterminer si gagnant
            // Team 1 et IDs... team1_id est dans fullMatch
            let isWinner = false;
            // Simplification : si winner_team_id == team1_id et participant.team == 1 -> win
            // Mais attention team1_id vs team number.
            // Dans submit/route.ts : team 1 -> team1_id.
            if (winnerTeamId === fullMatch.team1_id && participant.team === 1) isWinner = true;
            else if (winnerTeamId === fullMatch.team2_id && participant.team === 2) isWinner = true;

            const wins = isWinner ? 1 : 0;
            const losses = isWinner ? 0 : 1;

            // Calculer les points (incluant boosts)
            // On passe un Set contenant juste ce matchId pour que l'algo cherche les boosts de ce match
            const winMatches = isWinner ? new Set([matchId]) : new Set<string>();
            const matchPoints = await calculatePointsWithBoosts(
              wins, losses, [matchId], winMatches, userId
            );

            logger.info("Points calculated for user", { userId, isWinner, matchPoints });

            // 2. Mettre à jour global_points
            // On utilise rpc 'increment_global_points' idéalement pour atomicité, 
            // mais un simple update est acceptable ici vu le volume.
            // Mieux : récupérer points actuels ? Non, update direct : global_points = global_points + matchPoints
            const { error: rpcError } = await adminClient.rpc('increment_global_points', {
              p_user_id: userId,
              p_points: matchPoints
            });

            if (rpcError) {
              // Fallback si la fonction RPC n'existe pas
              logger.warn("RPC increment_global_points failed, falling back to get/set", rpcError);
              const { data: profile } = await adminClient.from("profiles").select("global_points").eq("id", userId).single();
              const newPoints = (profile?.global_points || 0) + matchPoints;
              await adminClient.from("profiles").update({ global_points: newPoints }).eq("id", userId);
            }

            // 3. Mettre à jour club_points (Classement par club respectif)
            // On attribue les points au club "Principal" du joueur (celui dans son profil)
            // peu importe où le match a été joué.
            const { data: userProfile } = await adminClient
              .from("profiles")
              .select("club_id")
              .eq("id", userId)
              .single();

            const userClubId = userProfile?.club_id;

            if (userClubId) {
              const { error: rpcError } = await adminClient.rpc('increment_club_points', {
                p_user_id: userId,
                p_club_id: userClubId,
                p_points: matchPoints
              });

              if (rpcError) {
                logger.warn("RPC increment_club_points failed, falling back to get/set", rpcError);
                const { data: uc } = await adminClient.from("user_clubs").select("club_points").eq("user_id", userId).eq("club_id", userClubId).maybeSingle();
                if (uc) {
                  const newClubPoints = (uc.club_points || 0) + matchPoints;
                  await adminClient.from("user_clubs").update({ club_points: newClubPoints }).eq("user_id", userId).eq("club_id", userClubId);
                }
              }
            }
          }
          logger.info("Points distribution completed successfully.");
        }

        // Revalider les chemins pour rafraîchir les données
        try {
          const { revalidatePath } = await import("next/cache");
          revalidatePath("/match/new");
          revalidatePath("/home");
          revalidatePath("/dashboard");
          revalidatePath("/dashboard/historique");
          revalidatePath("/dashboard/classement");
          logger.info("Paths revalidated after match confirmation");
        } catch (revError) {
          logger.warn("Revalidation failed after confirmation", { error: (revError as Error).message });
        }

        // === NOTIFICATIONS ENGAGEMENT (isolé, ne bloque jamais) ===
        if (fullMatch && participants && participants.length > 0) {
          try {
            const { notifyUser } = await import("@/lib/notifications/send-push");

            // Récupérer les prénoms pour personnalisation
            const participantUserIds = participants.map((p: any) => p.user_id);
            const { data: participantProfiles } = await adminClient
              .from("profiles")
              .select("id, first_name, display_name")
              .in("id", participantUserIds);

            const nameMap = new Map(
              (participantProfiles || []).map((p: any) => [
                p.id,
                p.first_name || (p.display_name ? p.display_name.split(/\s+/)[0] : "Joueur"),
              ])
            );

            // --- #1 : Notification "points gagnés" pour chaque joueur ---
            for (const participant of participants) {
              const uid = participant.user_id;
              const firstName = nameMap.get(uid) || "Joueur";
              const isWinner =
                (fullMatch.winner_team_id === fullMatch.team1_id && participant.team === 1) ||
                (fullMatch.winner_team_id === fullMatch.team2_id && participant.team === 2);
              const wins = isWinner ? 1 : 0;
              const losses = isWinner ? 0 : 1;
              const basePoints = wins * 10 + losses * 3;

              if (isWinner) {
                await notifyUser(uid, "match_points_earned",
                  "🎉 Victoire !",
                  `Bravo ${firstName} ! Tu remportes +${basePoints} points. Continue comme ça !`,
                  { type: "match_points_earned", match_id: matchId, points: basePoints, result: "win" }
                );
              } else {
                await notifyUser(uid, "match_points_earned",
                  "💪 Match enregistré",
                  `${firstName}, +${basePoints} points malgré la défaite. La prochaine sera la bonne !`,
                  { type: "match_points_earned", match_id: matchId, points: basePoints, result: "loss" }
                );
              }
            }

            // --- #3 : Notification "série de victoires" ---
            for (const participant of participants) {
              const uid = participant.user_id;
              const isWinner =
                (fullMatch.winner_team_id === fullMatch.team1_id && participant.team === 1) ||
                (fullMatch.winner_team_id === fullMatch.team2_id && participant.team === 2);

              if (!isWinner) continue;

              // Calculer la série de victoires actuelle
              const { data: recentMatches } = await adminClient
                .from("match_participants")
                .select("match_id, team")
                .eq("user_id", uid)
                .eq("player_type", "user");

              if (!recentMatches || recentMatches.length === 0) continue;

              const recentMatchIds = recentMatches.map((m: any) => m.match_id);
              const teamByMatch = new Map(recentMatches.map((m: any) => [m.match_id, m.team]));

              const { data: confirmedMatches } = await adminClient
                .from("matches")
                .select("id, winner_team_id, team1_id, team2_id, played_at")
                .in("id", recentMatchIds)
                .eq("status", "confirmed")
                .order("played_at", { ascending: false })
                .limit(20);

              if (!confirmedMatches) continue;

              let streak = 0;
              for (const m of confirmedMatches) {
                const team = teamByMatch.get(m.id);
                const teamId = team === 1 ? m.team1_id : m.team2_id;
                if (m.winner_team_id === teamId) {
                  streak++;
                } else {
                  break;
                }
              }

              const firstName = nameMap.get(uid) || "Joueur";

              if (streak === 3) {
                await notifyUser(uid, "win_streak",
                  "🔥 3 victoires d'affilée !",
                  `${firstName}, tu es en feu ! 3 victoires consécutives. Qui pourra t'arrêter ?`,
                  { type: "win_streak", streak: 3 }
                );
              } else if (streak === 5) {
                await notifyUser(uid, "win_streak",
                  "⚡ 5 victoires d'affilée !",
                  `Incroyable ${firstName} ! 5 victoires sans défaite, tu domines le padel ! 🏆`,
                  { type: "win_streak", streak: 5 }
                );
              } else if (streak === 10) {
                await notifyUser(uid, "win_streak",
                  "👑 10 victoires d'affilée !",
                  `${firstName}, 10 victoires consécutives ! Tu es une légende. 🐐`,
                  { type: "win_streak", streak: 10 }
                );
              } else if (streak === 7) {
                await notifyUser(uid, "win_streak",
                  "💎 7 victoires d'affilée !",
                  `${firstName}, 7 victoires sans perdre ! Tu es inarrêtable ! 🚀`,
                  { type: "win_streak", streak: 7 }
                );
              }
            }

            // --- #6 : Notification "ton partenaire a joué" ---
            for (const participant of participants) {
              const uid = participant.user_id;
              const firstName = nameMap.get(uid) || "Joueur";

              // Trouver le partenaire officiel (player_partnerships)
              const { data: partnerships } = await adminClient
                .from("player_partnerships")
                .select("player_id, partner_id")
                .or(`player_id.eq.${uid},partner_id.eq.${uid}`)
                .eq("status", "accepted");

              if (!partnerships || partnerships.length === 0) continue;

              for (const p of partnerships) {
                const partnerId = p.player_id === uid ? p.partner_id : p.player_id;

                // Vérifier que le partenaire n'est PAS dans ce match (sinon pas besoin de notifier)
                const partnerInMatch = participants.some((part: any) => part.user_id === partnerId);
                if (partnerInMatch) continue;

                const isWinner =
                  (fullMatch.winner_team_id === fullMatch.team1_id && participant.team === 1) ||
                  (fullMatch.winner_team_id === fullMatch.team2_id && participant.team === 2);

                const resultEmoji = isWinner ? "✅" : "😤";
                const resultText = isWinner ? "a gagné" : "a perdu";

                await notifyUser(partnerId, "partner_match_played",
                  "🎾 Ton partenaire a joué !",
                  `${firstName} ${resultText} son dernier match ${resultEmoji}. Et toi, tu joues quand ?`,
                  { type: "partner_match_played", partner_id: uid, result: isWinner ? "win" : "loss" }
                );
              }
            }

            logger.info("Engagement notifications sent after match confirmation");
          } catch (notifError) {
            logger.error("Engagement notifications error (non-blocking)", {
              error: (notifError as Error).message,
            });
          }
        }

        // === COACH IA AUTO-MESSAGE (isolé, ne bloque jamais) ===
        logger.info("Coach IA auto-message block reached", {
          hasFullMatch: !!fullMatch,
          participantsCount: participants?.length || 0,
        });
        if (fullMatch && participants && participants.length > 0) {
          try {
            const { sendCoachAutoMessage } = await import("@/lib/coach/auto-message");

            // Récupérer les prénoms si pas déjà fait
            const participantUserIds = participants.map((p: any) => p.user_id);
            const { data: coachProfiles } = await adminClient
              .from("profiles")
              .select("id, first_name, display_name")
              .in("id", participantUserIds);

            const coachNameMap = new Map(
              (coachProfiles || []).map((p: any) => [
                p.id,
                p.first_name || (p.display_name ? p.display_name.split(/\s+/)[0] : "Joueur"),
              ])
            );

            // Récupérer tous les participants pour les noms
            const { data: allMatchParticipants } = await adminClient
              .from("match_participants")
              .select("user_id, team, player_type")
              .eq("match_id", matchId)
              .eq("player_type", "user");

            const score = `${fullMatch.score_team1 ?? "?"}-${fullMatch.score_team2 ?? "?"}`;

            // Récupérer le score détaillé si disponible
            const { data: matchScoreData } = await adminClient
              .from("matches")
              .select("score_team1, score_team2")
              .eq("id", matchId)
              .single();

            const finalScore = matchScoreData
              ? `${matchScoreData.score_team1}-${matchScoreData.score_team2}`
              : score;

            for (const participant of participants) {
              const uid = participant.user_id;
              const firstName = coachNameMap.get(uid) || "Joueur";
              const playerTeam = participant.team;

              const isWinner =
                (fullMatch.winner_team_id === fullMatch.team1_id && playerTeam === 1) ||
                (fullMatch.winner_team_id === fullMatch.team2_id && playerTeam === 2);

              // Trouver le partenaire et les adversaires
              const teammates = (allMatchParticipants || []).filter(
                (p: any) => p.team === playerTeam && p.user_id !== uid
              );
              const opponents = (allMatchParticipants || []).filter(
                (p: any) => p.team !== playerTeam
              );

              const partnerName = teammates.length > 0
                ? coachNameMap.get(teammates[0].user_id) || null
                : null;
              const opponentNames = opponents.map(
                (o: any) => coachNameMap.get(o.user_id) || "Adversaire"
              );

              await sendCoachAutoMessage(uid, {
                matchId,
                score: finalScore,
                isWin: isWinner,
                partnerName,
                opponentNames,
                playerFirstName: firstName,
              });
            }

            logger.info("Coach IA auto-messages sent after match confirmation");
          } catch (coachError) {
            logger.error("Coach IA auto-message error (non-blocking)", {
              error: (coachError as Error).message,
            });
          }
        }

        // === LEAGUE POINTS (isolé, ne bloque jamais le match classique) ===
        if (fullMatch?.league_id) {
          try {
            const { processLeagueMatchStats } = await import("@/lib/utils/league-match-utils");
            await processLeagueMatchStats(
              adminClient,
              matchId,
              fullMatch.league_id,
              participants || [],
              fullMatch.winner_team_id,
              { team1_id: fullMatch.team1_id, team2_id: fullMatch.team2_id }
            );
            logger.info("League points distributed successfully", { leagueId: fullMatch.league_id });
          } catch (leagueError) {
            logger.error("League stats error (non-blocking)", { error: (leagueError as Error).message });
          }
        }
      } catch (distError) {
        logger.error("Error distributing points", { error: (distError as Error).message });
        // On ne bloque pas la réponse, le match EST confirmé.
      }

      return NextResponse.json({
        success: true,
        message: "Match confirmé ! Les points ont été ajoutés au classement.",
        matchConfirmed: true,
        confirmationCount,
        team1Confirmed: true,
        team2Confirmed: true
      });
    }

    return NextResponse.json({
      success: true,
      message: "Confirmation enregistrée. En attente d'un joueur de l'autre équipe.",
      matchConfirmed: false,
      confirmationCount,
      team1Confirmed,
      team2Confirmed
    });

  } catch (error) {
    logger.error("POST /api/matches/confirm - Unexpected error", {
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    return NextResponse.json({
      error: "Erreur serveur inattendue",
      details: (error as Error).message
    }, { status: 500 });
  }
}
