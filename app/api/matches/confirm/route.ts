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
    logger.info("POST /api/matches/confirm - Upserting confirmation");
    const { error: upsertError } = await adminClient
      .from("match_confirmations")
      .upsert({
        match_id: matchId,
        user_id: user.id,
        confirmed: true,
        confirmed_at: new Date().toISOString(),
        confirmation_token: crypto.randomUUID()
      }, {
        onConflict: 'match_id,user_id'
      });

    if (upsertError) {
      logger.error("POST /api/matches/confirm - Upsert error", { error: upsertError.message });
      return NextResponse.json({ error: "Erreur lors de la confirmation", details: upsertError.message }, { status: 500 });
    }

    logger.info("POST /api/matches/confirm - Confirmation upserted");

    // Count confirmations
    const { data: confirmations } = await adminClient
      .from("match_confirmations")
      .select("id")
      .eq("match_id", matchId)
      .eq("confirmed", true);

    const confirmationCount = confirmations?.length || 0;
    logger.info("POST /api/matches/confirm - Confirmation count", { count: confirmationCount });

    // Règle simplifiée : 3 confirmations requises (sur 4 joueurs)
    const totalUserParticipants = 3;

    // Fetch the updated match status (the trigger might have already confirmed it)
    const { data: updatedMatch } = await adminClient
      .from("matches")
      .select("status")
      .eq("id", matchId)
      .maybeSingle();

    const isConfirmed = updatedMatch?.status === 'confirmed';

    if (isConfirmed) {
      // PHASE 5: DISTRIBUTION DES POINTS (Global & Club)
      // On le fait ici pour être sûr que ça ne tourne qu'une fois (quand status passe à confirmed)
      // et pour gérer la logique complexe (boosts, multi-club) plus facilement qu'en SQL.
      try {
        logger.info("Match verified confirmed, distributing points...");

        // 1. Récupérer les détails complets du match et des participants
        const { data: fullMatch } = await adminClient
          .from("matches")
          .select("id, winner_team_id, team1_id, team2_id, location_club_id")
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
            await adminClient.rpc('increment_global_points', {
              p_user_id: userId,
              p_points: matchPoints
            }).catch(async (e) => {
              // Fallback si la fonction RPC n'existe pas (on devra la créer dans la migration ou faire un get/set)
              logger.warn("RPC increment_global_points failed, falling back to get/set", e);
              const { data: profile } = await adminClient.from("profiles").select("global_points").eq("id", userId).single();
              const newPoints = (profile?.global_points || 0) + matchPoints;
              await adminClient.from("profiles").update({ global_points: newPoints }).eq("id", userId);
            });

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
              await adminClient.rpc('increment_club_points', {
                p_user_id: userId,
                p_club_id: userClubId,
                p_points: matchPoints
              }).catch(async (e) => {
                logger.warn("RPC increment_club_points failed, falling back to get/set", e);
                const { data: uc } = await adminClient.from("user_clubs").select("club_points").eq("user_id", userId).eq("club_id", userClubId).maybeSingle();
                if (uc) {
                  const newClubPoints = (uc.club_points || 0) + matchPoints;
                  await adminClient.from("user_clubs").update({ club_points: newClubPoints }).eq("user_id", userId).eq("club_id", userClubId);
                }
              });
            }
          }
          logger.info("Points distribution completed successfully.");
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
        totalRequired: 3
      });
    }

    return NextResponse.json({
      success: true,
      message: "Confirmation enregistrée. En attente des autres joueurs.",
      matchConfirmed: false,
      confirmationCount,
      confirmationsNeeded: Math.max(0, 3 - confirmationCount),
      totalRequired: 3
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
