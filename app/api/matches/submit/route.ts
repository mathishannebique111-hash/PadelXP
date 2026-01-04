import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_MATCHES_PER_DAY } from "@/lib/match-constants";
import { consumeBoostForMatch, canPlayerUseBoost, getPlayerBoostCreditsAvailable } from "@/lib/utils/boost-utils";
import { logger } from "@/lib/logger"; // ✅ AJOUTÉ
import { updateEngagementMetrics, checkAutoExtensionEligibility, grantAutoExtension } from "@/lib/trial-hybrid";
import { cacheDelete, cacheSet } from "@/lib/cache/redis";


const GUEST_USER_ID = "00000000-0000-0000-0000-000000000000";


/**
 * Schéma strict de soumission d'un match :
 * - 2 ou 4 joueurs uniquement, chacun avec un type valide et des identifiants non vides
 * - Winner limité à "1" ou "2"
 * - Minimum 2 sets, chaque score étant une chaîne numérique non vide
 * - Tie-break optionnel mais complet si présent
 * - useBoost optionnel et booléen
 */
const matchSubmitSchema = z.object({
  players: z
    .array(
      z.object({
        player_type: z.enum(["user", "guest"]),
        user_id: z.string().min(1),
        guest_player_id: z.string().min(1).nullable(),
      })
    )
    .min(2, "Au moins 2 joueurs requis")
    .max(4, "Maximum 4 joueurs autorisés")
    .refine((players) => players.length === 2 || players.length === 4, {
      message: "Le match doit avoir 2 ou 4 joueurs",
    }),
  winner: z.enum(["1", "2"]),
  sets: z
    .array(
      z.object({
        setNumber: z.number().int().positive(),
        team1Score: z.string().min(1),
        team2Score: z.string().min(1),
      })
    )
    .min(2, "Au moins 2 sets requis"),
  tieBreak: z
    .object({
      team1Score: z.string().min(1),
      team2Score: z.string().min(1),
    })
    .optional(),
  useBoost: z.boolean().optional(),
});


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


export async function POST(req: Request) {
  try {
    logger.info("Match submission API called"); // ✅ REMPLACÉ console.log
    
    let body;
    try {
      body = await req.json();
      logger.info("Request body parsed", { 
        playersCount: body.players?.length, 
        winner: body.winner, 
        setsCount: body.sets?.length 
      }); // ✅ REMPLACÉ + anonymisé
    } catch (parseError) {
      logger.error("Error parsing request body", { 
        error: (parseError as Error).message 
      }); // ✅ REMPLACÉ
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }
    
    const parsedBody = matchSubmitSchema.safeParse(body);
    if (!parsedBody.success) {
      logger.error("Match submission validation failed", { 
        errors: parsedBody.error.flatten().fieldErrors 
      }); // ✅ REMPLACÉ
      return NextResponse.json({ error: "Données invalides", details: parsedBody.error.flatten().fieldErrors }, { status: 400 });
    }


    const { players, winner, sets, tieBreak, useBoost } = parsedBody.data;
    
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
              logger.error("Error setting cookies", { 
                error: (error as Error).message 
              }); // ✅ REMPLACÉ
            }
          },
        },
      }
    );


    const { data: { user }, error: authError } = await supabase.auth.getUser();
    logger.info("User auth check", { 
      authenticated: !!user, 
      hasAuthError: !!authError 
    }); // ✅ REMPLACÉ
    
    if (!user) {
      logger.warn("Unauthorized access attempt"); // ✅ REMPLACÉ
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    // Valider que nous avons 2 ou 4 joueurs (simple ou double)
    logger.info("Validating players", { 
      playerCount: players?.length 
    }); // ✅ REMPLACÉ
    if (!players || (players.length !== 2 && players.length !== 4)) {
      logger.error("Invalid players count", { 
        count: players?.length,
        expected: "2 or 4"
      }); // ✅ REMPLACÉ
      return NextResponse.json({ error: `2 ou 4 joueurs requis, reçu: ${players?.length || 0}` }, { status: 400 });
    }
    
    const isDouble = players.length === 4;


    // Vérifier que tous les joueurs users sont uniques
    const userPlayers = players
      .filter((p) => p.player_type === "user")
      .map((p) => p.user_id);
    logger.info("User players extracted", { 
      userPlayerCount: userPlayers.length 
    }); // ✅ REMPLACÉ
    if (userPlayers.length !== new Set(userPlayers).size) {
      logger.error("Duplicate user players detected"); // ✅ REMPLACÉ
      return NextResponse.json({ error: "Les joueurs doivent être uniques" }, { status: 400 });
    }


    // Validation : Vérifier que tous les joueurs users appartiennent au même club
    if (userPlayers.length > 0) {
      const { data: currentUserProfile } = await supabase
        .from("profiles")
        .select("club_id")
        .eq("id", user.id)
        .maybeSingle();


      let userClubId = currentUserProfile?.club_id || null;


      if (!userClubId) {
        const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
          .from("profiles")
          .select("club_id")
          .eq("id", user.id)
          .maybeSingle();
        if (adminProfileError) {
          logger.error("Admin profile fetch error", { 
            error: adminProfileError.message 
          }); // ✅ REMPLACÉ
        }
        if (adminProfile?.club_id) {
          userClubId = adminProfile.club_id;
        }
      }


      if (!userClubId) {
        logger.error("User without club trying to create match"); // ✅ REMPLACÉ
        return NextResponse.json({ error: "Vous devez être rattaché à un club pour enregistrer un match" }, { status: 403 });
      }


      const { data: playerProfiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, club_id")
        .in("id", userPlayers);


      if (profilesError || !playerProfiles || playerProfiles.length !== userPlayers.length) {
        logger.error("Error fetching player profiles", { 
          expected: userPlayers.length, 
          received: playerProfiles?.length,
          error: profilesError?.message 
        }); // ✅ REMPLACÉ
        return NextResponse.json({ error: "Impossible de vérifier les clubs des joueurs" }, { status: 500 });
      }


      const allSameClub = playerProfiles.every((profile: any) => profile.club_id === userClubId);


      if (!allSameClub) {
        logger.error("Players from different clubs detected"); // ✅ REMPLACÉ
        return NextResponse.json({
          error: "Tous les joueurs doivent appartenir au même club."
        }, { status: 403 });
      }
    }


    // Vérifier que tous les joueurs guests sont uniques
    const guestPlayers = players
      .filter((p) => p.player_type === "guest" && p.guest_player_id)
      .map((p) => p.guest_player_id);
    logger.info("Guest players extracted", { 
      guestPlayerCount: guestPlayers.length 
    }); // ✅ REMPLACÉ
    if (guestPlayers.length !== new Set(guestPlayers).size) {
      logger.error("Duplicate guest players detected"); // ✅ REMPLACÉ
      return NextResponse.json({ error: "Les joueurs invités doivent être uniques" }, { status: 400 });
    }


    // Valider les sets
    logger.info("Validating sets", { 
      setsCount: sets?.length 
    }); // ✅ REMPLACÉ
    if (!sets || sets.length < 2) {
      logger.error("Invalid sets count", { 
        count: sets?.length,
        expected: ">= 2"
      }); // ✅ REMPLACÉ
      return NextResponse.json({ error: `Au moins 2 sets requis, reçu: ${sets?.length || 0}` }, { status: 400 });
    }


    // Générer des UUIDs pour les équipes (basés sur les IDs des joueurs pour l'unicité)
    // Match simple (2 joueurs) : Équipe 1 = joueur 0, Équipe 2 = joueur 1
    // Match double (4 joueurs) : Équipe 1 = joueurs 0 et 1, Équipe 2 = joueurs 2 et 3
    const team1PlayerIds = isDouble 
      ? [players[0].user_id, players[1].user_id].sort().join("-")
      : players[0].user_id;
    const team2PlayerIds = isDouble
      ? [players[2].user_id, players[3].user_id].sort().join("-")
      : players[1].user_id;
    
    // Générer des UUIDs déterministes pour les équipes (basés sur les joueurs)
    // Utilisation d'un hash pour créer des UUIDs cohérents (même équipe = même UUID)
    // NOTE: Ces UUIDs ne sont PAS des références à une table teams - ce sont des identifiants uniques pour les équipes
    const team1Hash = createHash("sha256").update(`team1-${team1PlayerIds}`).digest("hex");
    const team2Hash = createHash("sha256").update(`team2-${team2PlayerIds}`).digest("hex");
    
    // Convertir en UUID v4 format (8-4-4-4-12)
    const team1_id = `${team1Hash.slice(0, 8)}-${team1Hash.slice(8, 12)}-${team1Hash.slice(12, 16)}-${team1Hash.slice(16, 20)}-${team1Hash.slice(20, 32)}`;
    const team2_id = `${team2Hash.slice(0, 8)}-${team2Hash.slice(8, 12)}-${team2Hash.slice(12, 16)}-${team2Hash.slice(16, 20)}-${team2Hash.slice(20, 32)}`;
    
    // Déterminer winner_team_id (UUID de l'équipe gagnante)
    const winner_team_id = Number(winner) === 1 ? team1_id : team2_id;
    
    logger.info("Team IDs generated", { 
      team1_id: team1_id.slice(0, 8) + "...", 
      team2_id: team2_id.slice(0, 8) + "...", 
      winner_team_id: winner_team_id.slice(0, 8) + "..." 
    }); // ✅ REMPLACÉ + tronqué
    
    // Calculer les scores totaux (somme des sets gagnés par chaque équipe)
    let score_team1 = 0;
    let score_team2 = 0;
    
    sets.forEach((set) => {
      const team1Score = parseInt(set.team1Score) || 0;
      const team2Score = parseInt(set.team2Score) || 0;
      
      if (team1Score > team2Score) {
        score_team1 += 1;
      } else if (team2Score > team1Score) {
        score_team2 += 1;
      }
    });
    
    // Déterminer si le match a été décidé au tie-break
    const decided_by_tiebreak = !!(tieBreak && tieBreak.team1Score && tieBreak.team2Score && parseInt(tieBreak.team1Score) !== parseInt(tieBreak.team2Score));


    // Vérifier la limite de 3 matchs par jour et par joueur
    // Ne pas bloquer l'enregistrement, mais identifier les joueurs qui ont atteint la limite
    const playersOverLimit: string[] = [];
    
    if (userPlayers.length > 0) {
      logger.info("Checking daily match limit", { 
        userPlayerCount: userPlayers.length 
      }); // ✅ REMPLACÉ
      
      // Obtenir la date d'aujourd'hui en UTC (format ISO pour Supabase)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const todayStart = today.toISOString();
      today.setUTCHours(23, 59, 59, 999);
      const todayEnd = today.toISOString();


      // Pour chaque joueur user, compter les matchs d'aujourd'hui
      for (const playerUserId of userPlayers) {
        // Étape 1: Récupérer tous les match_ids du joueur depuis match_participants
        const { data: participants, error: participantsError } = await supabaseAdmin
          .from("match_participants")
          .select("match_id")
          .eq("user_id", playerUserId)
          .eq("player_type", "user");


        if (participantsError) {
          logger.error("Error fetching participants", { 
            playerId: playerUserId.slice(0, 8) + "...",
            error: participantsError.message 
          }); // ✅ REMPLACÉ
          continue;
        }


        if (!participants || participants.length === 0) {
          logger.debug("No participants found for player"); // ✅ REMPLACÉ
          continue;
        }


        const matchIds = participants.map((p: any) => p.match_id);


        // Étape 2: Récupérer les matchs correspondants et filtrer par date d'aujourd'hui
        const { data: todayMatches, error: matchesError } = await supabaseAdmin
          .from("matches")
          .select("id")
          .in("id", matchIds)
          .gte("played_at", todayStart)
          .lte("played_at", todayEnd);


        if (matchesError) {
          logger.error("Error counting today matches", { 
            playerId: playerUserId.slice(0, 8) + "...",
            error: matchesError.message 
          }); // ✅ REMPLACÉ
          continue;
        }


        const matchCount = todayMatches?.length || 0;
        logger.debug(`Player ${playerUserId.slice(0, 8)}...: ${matchCount} matches today`); // ✅ REMPLACÉ + tronqué


        if (matchCount >= MAX_MATCHES_PER_DAY) {
          logger.warn("Player reached daily limit", { 
            playerId: playerUserId.slice(0, 8) + "...",
            matchCount,
            limit: MAX_MATCHES_PER_DAY 
          }); // ✅ REMPLACÉ
          playersOverLimit.push(playerUserId);
        }
      }
      
      if (playersOverLimit.length === 0) {
        logger.info("Daily match limit respected for all players"); // ✅ REMPLACÉ
      }
    }


    // Préparer les données d'insertion selon le schéma Supabase
    const matchData = { 
      team1_id,
      team2_id,
      winner_team_id,
      score_team1,
      score_team2,
      played_at: new Date().toISOString(),
      decided_by_tiebreak
    };
    
    logger.debug("Match data prepared for insertion"); // ✅ REMPLACÉ
    
    // Créer le match directement (sans système de confirmation)
    const { data: match, error: e1 } = await supabaseAdmin
      .from("matches")
      .insert(matchData)
      .select("id")
      .single();
    
    if (e1) {
      logger.error("Error creating match", { 
        error: e1.message,
        details: e1.details,
        code: e1.code 
      }); // ✅ REMPLACÉ
      return NextResponse.json({ error: e1.message }, { status: 400 });
    }
    
    logger.info("Match created successfully", { 
      matchId: match.id 
    }); // ✅ REMPLACÉ


    // Créer les participants avec le nouveau format
    const participants = players.map((player, index) => ({
      match_id: match.id,
      user_id: player.user_id,
      player_type: player.player_type,
      guest_player_id: player.guest_player_id,
      team: isDouble ? (index < 2 ? 1 : 2) : (index === 0 ? 1 : 2),
    }));
    
    logger.info("Creating participants", { 
      participantCount: participants.length 
    }); // ✅ REMPLACÉ


    const { error: e2 } = await supabaseAdmin.from("match_participants").insert(participants);
    if (e2) {
      logger.error("Error creating participants", { 
        error: e2.message 
      }); // ✅ REMPLACÉ
      return NextResponse.json({ error: e2.message }, { status: 400 });
    }

    // ======= AUTO-EXTENSION TRIAL (par club) =======
try {
  // Récupérer les clubs des participants (users uniquement)
  const userIds = participants.filter(p => p.player_type === 'user').map(p => p.user_id);
  if (userIds.length > 0) {
    const { data: participantProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, club_id")
      .in("id", userIds);

    if (profilesError) {
      logger.error("[matches/submit] Error fetching participant profiles for trial extension", { error: profilesError.message });
    } else {
      const clubIds = Array.from(new Set((participantProfiles || []).map(p => p.club_id).filter(Boolean)));
      for (const clubId of clubIds) {
        try {
          logger.info("[matches/submit] Trial check after match", { clubId: clubId!.substring(0, 8) + "…" });
          await updateEngagementMetrics(clubId!);
          const eligibility = await checkAutoExtensionEligibility(clubId!);
          logger.info("[matches/submit] Trial eligibility", { clubId: clubId!.substring(0, 8) + "…", eligible: eligibility.eligible, reason: eligibility.reason });
          if (eligibility.eligible && eligibility.reason) {
            const grantRes = await grantAutoExtension(clubId!, eligibility.reason);
            if (grantRes.success) {
              logger.info("[matches/submit] Auto extension granted after match submit", { clubId: clubId!.substring(0, 8) + "…", reason: eligibility.reason });
              // Rafraîchir les pages frontend
              revalidatePath('/dashboard');
              revalidatePath('/dashboard/facturation');
            } else {
              logger.warn("[matches/submit] Auto extension grant failed", { clubId: clubId!.substring(0, 8) + "…", error: grantRes.error });
            }
          } else {
            logger.info("[matches/submit] No auto extension (threshold not met or already unlocked)", { clubId: clubId!.substring(0, 8) + "…" });
          }
        } catch (extErr) {
          logger.error("[matches/submit] Auto extension check error", { clubId: clubId!.substring(0, 8) + "…", error: (extErr as Error).message });
        }
      }
    }
  }
} catch (extOuterErr) {
  logger.error("[matches/submit] Auto extension outer error", { error: (extOuterErr as Error).message });
}
// ===============================================

    // Gérer l'application d'un boost si demandé
    let boostApplied = false;
    let boostError: string | null = null;
    let boostPointsInfo: { before: number; after: number } | null = null;


    logger.info("Boost check", { 
      useBoost, 
      userId: user.id 
    }); // ✅ REMPLACÉ
    
    if (useBoost === true) {
      logger.info("Boost requested", { 
        userId: user.id 
      }); // ✅ REMPLACÉ
      
      const winner_team = Number(winner) === 1 ? team1_id : team2_id;
      const currentUserParticipant = participants.find(p => p.user_id === user.id);
      
      if (currentUserParticipant) {
        const currentUserTeam = currentUserParticipant.team;
        const isWinner = (currentUserTeam === 1 && winner_team === team1_id) || 
                         (currentUserTeam === 2 && winner_team === team2_id);
        
        if (isWinner) {
          const isUserOverLimit = playersOverLimit.includes(user.id);
          
          if (!isUserOverLimit) {
            const creditsAvailable = await getPlayerBoostCreditsAvailable(user.id);
            
            if (creditsAvailable > 0) {
              const canUse = await canPlayerUseBoost(user.id);
              
              if (canUse.canUse) {
                const pointsBeforeBoost = 10;
                
                const boostResult = await consumeBoostForMatch(
                  user.id,
                  match.id,
                  pointsBeforeBoost
                );
                
                if (boostResult.success && boostResult.pointsAfterBoost) {
                  boostApplied = true;
                  boostPointsInfo = {
                    before: pointsBeforeBoost,
                    after: boostResult.pointsAfterBoost,
                  };
                  logger.info("Boost applied successfully", { 
                    matchId: match.id,
                    pointsBefore: pointsBeforeBoost,
                    pointsAfter: boostResult.pointsAfterBoost 
                  }); // ✅ REMPLACÉ
                    
                  const creditsAfterConsumption = await getPlayerBoostCreditsAvailable(user.id);
                  logger.debug("Boost stats verified", { 
                    creditsBefore: creditsAvailable,
                    creditsAfter: creditsAfterConsumption 
                  }); // ✅ REMPLACÉ
                } else {
                  boostError = boostResult.error || "Erreur lors de l'application du boost";
                  logger.error("Boost application failed", { 
                    error: boostError 
                  }); // ✅ REMPLACÉ
                }
              } else {
                boostError = canUse.reason || "Tu as atteint la limite mensuelle de 10 boosts";
                logger.warn("Boost monthly limit reached", { 
                  reason: boostError 
                }); // ✅ REMPLACÉ
              }
            } else {
              boostError = "Tu n'as plus de boosts disponibles";
              logger.warn("No boost credits available"); // ✅ REMPLACÉ
            }
          } else {
            boostError = "Le boost ne peut pas être appliqué car tu as déjà atteint ta limite de 2 matchs par jour";
            logger.warn("Boost blocked by daily match limit"); // ✅ REMPLACÉ
          }
        } else {
          boostError = "Le boost ne peut être utilisé que si tu gagnes le match";
          logger.warn("Boost blocked: player lost"); // ✅ REMPLACÉ
        }
      } else {
        boostError = "Joueur non trouvé parmi les participants";
        logger.error("Player not found in participants"); // ✅ REMPLACÉ
      }
    }


    // Si un boost a été appliqué, attendre un peu et vérifier qu'il est bien visible dans la base de données
    if (boostApplied && match?.id) {
      logger.debug("Waiting for boost DB commit"); // ✅ REMPLACÉ
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let verifyBoost = null;
      let verifyError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabaseAdmin
          .from("player_boost_uses")
          .select("id, match_id, points_after_boost, applied_at, user_id")
          .eq("user_id", user.id)
          .eq("match_id", match.id)
          .maybeSingle();
        
        if (error) {
          verifyError = error;
          logger.error(`Boost verify attempt ${attempt + 1} failed`, { 
            error: error.message 
          }); // ✅ REMPLACÉ
        } else if (data) {
          verifyBoost = data;
          logger.info("Boost verified in database", { 
            matchId: data.match_id?.slice(0, 8) + "...",
            pointsAfterBoost: data.points_after_boost 
          }); // ✅ REMPLACÉ + tronqué
          break;
        } else {
          logger.warn(`Boost verify attempt ${attempt + 1}: not found`); // ✅ REMPLACÉ
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
      
      if (!verifyBoost) {
        logger.error("CRITICAL: Boost not found in database after retries"); // ✅ REMPLACÉ
      }
    }


    // CACHE DÉSACTIVÉ TEMPORAIREMENT - pas besoin d'invalider
    logger.info("Match submitted successfully, leaderboard will recalculate on next fetch");

    try {
      logger.info("Revalidating paths"); // ✅ REMPLACÉ
      // Revalider /home en premier pour s'assurer que le classement global est mis à jour
      revalidatePath("/home", "page");
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/historique");
      revalidatePath("/dashboard/classement");
      revalidatePath("/dashboard/membres");
      revalidatePath("/challenges");
      revalidatePath("/");
      revalidatePath("/matches/history");
      revalidatePath("/boost");
      logger.info("All paths revalidated successfully"); // ✅ REMPLACÉ
    } catch (revalidateError) {
      logger.warn("Revalidation failed", { 
        error: (revalidateError as Error).message 
      }); // ✅ REMPLACÉ
    }


    logger.info("Match submission completed successfully", { 
      matchId: match.id 
    }); // ✅ REMPLACÉ
    
    // Préparer la réponse avec avertissement si nécessaire
    let responseMessage = "Match enregistré avec succès.";
    let warning: string | null = null;
    
    if (playersOverLimit.length > 0) {
      const { data: overLimitProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", playersOverLimit);
      
      const overLimitNames = (overLimitProfiles || [])
        .map((p: any) => p.display_name || "Ce joueur")
        .join(", ");
      
      if (playersOverLimit.length === userPlayers.length) {
        warning = `Attention : Tu as déjà enregistré 2 matchs aujourd'hui. Ce match a été enregistré mais aucun point ne sera ajouté à ton classement.`;
      } else if (playersOverLimit.length === 1 && playersOverLimit[0] === user.id) {
        warning = `Attention : Tu as déjà enregistré 2 matchs aujourd'hui. Ce match a été enregistré mais aucun point ne sera ajouté à ton classement. Les autres joueurs recevront leurs points normalement.`;
      } else {
        warning = `Attention : ${overLimitNames} ${playersOverLimit.length === 1 ? 'a déjà' : 'ont déjà'} enregistré 2 matchs aujourd'hui. Ce match a été enregistré mais aucun point ne sera ajouté ${playersOverLimit.length === 1 ? 'à son' : 'à leur'} classement. ${playersOverLimit.length < userPlayers.length ? 'Les autres joueurs recevront leurs points normalement.' : ''}`;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: responseMessage,
      warning: warning,
      playersOverLimit: playersOverLimit.length > 0 ? playersOverLimit : undefined,
      matchId: match.id,
      boostApplied: boostApplied,
      boostError: boostError || undefined,
      boostPointsInfo: boostPointsInfo || undefined,
    });
  } catch (error) {
    logger.error("Unexpected error in match submission", { 
      error: (error as Error).message,
      stack: (error as Error).stack 
    }); // ✅ REMPLACÉ
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
