import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { MAX_MATCHES_PER_DAY } from "@/lib/match-constants";
import { consumeBoostForMatch, canPlayerUseBoost, getPlayerBoostCreditsAvailable } from "@/lib/utils/boost-utils";

const GUEST_USER_ID = "00000000-0000-0000-0000-000000000000";

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
    console.log("📥 Match submission API called");
    let body;
    try {
      body = await req.json();
      console.log("📋 Request body:", { players: body.players?.length, winner: body.winner, sets: body.sets?.length });
    } catch (parseError) {
      console.error("❌ Error parsing request body:", parseError);
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }
    
  const { players, winner, sets, tieBreak, useBoost } = body as {
    players: Array<{
      player_type: "user" | "guest";
      user_id: string;
      guest_player_id: string | null;
    }>;
    winner: "1" | "2";
    sets: Array<{
      setNumber: number;
      team1Score: string;
      team2Score: string;
    }>;
    tieBreak?: {
      team1Score: string;
      team2Score: string;
    };
    useBoost?: boolean; // Optionnel : true si le joueur veut utiliser un boost
  };
  
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
            // Gérer les erreurs de cookies silencieusement
            console.error("Error setting cookies:", error);
          }
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log("👤 User auth:", user ? "authenticated" : "not authenticated", authError);
  
  if (!user) {
    console.error("❌ Unauthorized access");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Valider que nous avons 2 ou 4 joueurs (simple ou double)
  console.log("🔍 Validating players:", players?.length, players);
  if (!players || (players.length !== 2 && players.length !== 4)) {
    console.error("❌ Invalid players count:", players?.length, "Expected 2 or 4");
    return NextResponse.json({ error: `2 ou 4 joueurs requis, reçu: ${players?.length || 0}` }, { status: 400 });
  }
  
  const isDouble = players.length === 4;

  // Vérifier que tous les joueurs users sont uniques
  const userPlayers = players
    .filter((p) => p.player_type === "user")
    .map((p) => p.user_id);
  console.log("👥 User players:", userPlayers);
  if (userPlayers.length !== new Set(userPlayers).size) {
    console.error("❌ Duplicate user players detected");
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
        console.error("❌ [Match submit] admin profile fetch error", adminProfileError);
      }
      if (adminProfile?.club_id) {
        userClubId = adminProfile.club_id;
      }
    }

    if (!userClubId) {
      console.error("❌ User without club trying to create a match");
      return NextResponse.json({ error: "Vous devez être rattaché à un club pour enregistrer un match" }, { status: 403 });
    }

    const { data: playerProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, club_id")
      .in("id", userPlayers);

    if (profilesError || !playerProfiles || playerProfiles.length !== userPlayers.length) {
      console.error("❌ Error fetching player profiles or missing players:", profilesError, { expected: userPlayers.length, received: playerProfiles?.length });
      return NextResponse.json({ error: "Impossible de vérifier les clubs des joueurs" }, { status: 500 });
    }

    const allSameClub = playerProfiles.every((profile: any) => profile.club_id === userClubId);

    if (!allSameClub) {
      console.error("❌ Players from different clubs detected");
      return NextResponse.json({
        error: "Tous les joueurs doivent appartenir au même club."
      }, { status: 403 });
    }
  }

  // Vérifier que tous les joueurs guests sont uniques
  const guestPlayers = players
    .filter((p) => p.player_type === "guest" && p.guest_player_id)
    .map((p) => p.guest_player_id);
  console.log("👤 Guest players:", guestPlayers);
  if (guestPlayers.length !== new Set(guestPlayers).size) {
    console.error("❌ Duplicate guest players detected");
    return NextResponse.json({ error: "Les joueurs invités doivent être uniques" }, { status: 400 });
  }

  // Valider les sets
  console.log("🎾 Validating sets:", sets?.length, sets);
  if (!sets || sets.length < 2) {
    console.error("❌ Invalid sets count:", sets?.length, "Expected at least 2");
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
  
  console.log("🔍 Team IDs générés:", {
    team1_id,
    team2_id,
    winner_team_id,
    team1_players: team1PlayerIds,
    team2_players: team2PlayerIds,
  });
  
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
    console.log("🔍 Vérification de la limite de matchs par jour pour les joueurs:", userPlayers);
    
    // Obtenir la date d'aujourd'hui en UTC (format ISO pour Supabase)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    today.setUTCHours(23, 59, 59, 999);
    const todayEnd = today.toISOString();

    console.log("📅 Date du jour (UTC):", { todayStart, todayEnd });

    // Pour chaque joueur user, compter les matchs d'aujourd'hui
    for (const playerUserId of userPlayers) {
      // Étape 1: Récupérer tous les match_ids du joueur depuis match_participants
      const { data: participants, error: participantsError } = await supabaseAdmin
        .from("match_participants")
        .select("match_id")
        .eq("user_id", playerUserId)
        .eq("player_type", "user");

      if (participantsError) {
        console.error("❌ Error fetching participants for player:", playerUserId, participantsError);
        // En cas d'erreur, on continue (ne pas bloquer l'insertion)
        continue;
      }

      if (!participants || participants.length === 0) {
        console.log(`📊 Joueur ${playerUserId}: 0 match aujourd'hui (aucun participant trouvé)`);
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
        console.error("❌ Error counting today's matches for player:", playerUserId, matchesError);
        // En cas d'erreur, on continue (ne pas bloquer l'insertion)
        continue;
      }

      const matchCount = todayMatches?.length || 0;
      console.log(`📊 Joueur ${playerUserId}: ${matchCount} match(s) aujourd'hui`);

      if (matchCount >= MAX_MATCHES_PER_DAY) {
        console.warn(`⚠️ Joueur ${playerUserId} a déjà ${matchCount} match(s) aujourd'hui (limite: ${MAX_MATCHES_PER_DAY}) - aucun point ne sera ajouté`);
        playersOverLimit.push(playerUserId);
      }
    }
    
    if (playersOverLimit.length === 0) {
      console.log("✅ Limite de matchs par jour respectée pour tous les joueurs");
    }
  }

  // Préparer les données d'insertion selon le schéma Supabase
  // NOTE: La colonne 'score' n'existe pas dans Supabase, on utilise uniquement les colonnes requises
  const matchData = { 
    team1_id,              // ✅ OBLIGATOIRE (UUID)
    team2_id,              // ✅ OBLIGATOIRE (UUID)
    winner_team_id,        // ✅ UUID de l'équipe gagnante
    score_team1,           // ✅ Nombre de sets gagnés par l'équipe 1
    score_team2,           // ✅ Nombre de sets gagnés par l'équipe 2
    played_at: new Date().toISOString(), // ✅ Timestamp du match
    decided_by_tiebreak    // ✅ Indique si la victoire s'est jouée au tie-break
    // ❌ score: scoreString - COLONNE N'EXISTE PAS dans Supabase
  };
  
  console.log("💾 Données d'insertion dans matches:", JSON.stringify(matchData, null, 2));
  console.log("💾 Structure complète:", {
    team1_id,
    team2_id,
    winner_team_id,
    score_team1,
    score_team2,
    played_at: matchData.played_at,
  });
  
  // Créer le match directement (sans système de confirmation)
  const { data: match, error: e1 } = await supabase
    .from("matches")
    .insert(matchData)
    .select("id")
    .single();
  
  if (e1) {
    console.error("❌ Error creating match:", JSON.stringify(e1, null, 2));
    console.error("❌ Error details:", {
      message: e1.message,
      details: e1.details,
      hint: e1.hint,
      code: e1.code,
    });
    return NextResponse.json({ error: e1.message }, { status: 400 });
  }
  
  console.log("✅ Match created:", match?.id);

  // Créer les participants avec le nouveau format
  // Match simple (2 joueurs) : équipe 1 = joueur 0, équipe 2 = joueur 1
  // Match double (4 joueurs) : équipe 1 = joueurs 0 et 1, équipe 2 = joueurs 2 et 3
  const participants = players.map((player, index) => ({
    match_id: match.id,
    user_id: player.user_id,
    player_type: player.player_type,
    guest_player_id: player.guest_player_id,
    team: isDouble ? (index < 2 ? 1 : 2) : (index === 0 ? 1 : 2), // Équipe 1 ou 2 selon le format
  }));
  
  console.log("👥 Creating participants:", participants.length);

  const { error: e2 } = await supabase.from("match_participants").insert(participants);
  if (e2) {
    console.error("❌ Error creating participants:", e2);
    return NextResponse.json({ error: e2.message }, { status: 400 });
  }

  // Gérer l'application d'un boost si demandé
  let boostApplied = false;
  let boostError: string | null = null;
  let boostPointsInfo: { before: number; after: number } | null = null;

  console.log("🔍 [Match Submit] Boost check - useBoost value:", useBoost, "type:", typeof useBoost, "user:", user.id);
  
  if (useBoost === true) {
    console.log("⚡ [Match Submit] Boost requested by user:", user.id);
    
    // Vérifier que le joueur connecté a gagné le match
    const winner_team = Number(winner) === 1 ? team1_id : team2_id;
    const currentUserParticipant = participants.find(p => p.user_id === user.id);
    
    if (currentUserParticipant) {
      const currentUserTeam = currentUserParticipant.team;
      const isWinner = (currentUserTeam === 1 && winner_team === team1_id) || 
                       (currentUserTeam === 2 && winner_team === team2_id);
      
      if (isWinner) {
        // Le joueur a gagné, vérifier s'il peut utiliser un boost
        // Vérifier d'abord si le joueur n'a pas atteint sa limite quotidienne de matchs
        const isUserOverLimit = playersOverLimit.includes(user.id);
        
        if (!isUserOverLimit) {
          // Le joueur n'a pas atteint sa limite quotidienne, vérifier s'il a des crédits disponibles
          const { getPlayerBoostCreditsAvailable } = await import('@/lib/utils/boost-utils');
          const creditsAvailable = await getPlayerBoostCreditsAvailable(user.id);
          
          if (creditsAvailable > 0) {
            // Le joueur a des crédits disponibles et n'a pas atteint sa limite quotidienne
            // Vérifier aussi la limite mensuelle avant d'appliquer le boost
            const canUse = await canPlayerUseBoost(user.id);
            
            if (canUse.canUse) {
              // Points normaux pour une victoire : +10
              const pointsBeforeBoost = 10;
              
              // Consommer le boost
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
                console.log("✅ Boost applied successfully:", {
                  userId: user.id,
                  matchId: match.id,
                  pointsBefore: pointsBeforeBoost,
                  pointsAfter: boostResult.pointsAfterBoost,
                });
                
                // Vérifier que le boost a bien été consommé en recalculant les stats
                const { getPlayerBoostCreditsAvailable } = await import('@/lib/utils/boost-utils');
                const creditsAfterConsumption = await getPlayerBoostCreditsAvailable(user.id);
                console.log("✅ Boost stats after consumption:", {
                  userId: user.id,
                  creditsBefore: creditsAvailable,
                  creditsAfter: creditsAfterConsumption,
                  expectedAfter: creditsAvailable - 1
                });
              } else {
                boostError = boostResult.error || "Erreur lors de l'application du boost";
                console.error("❌ Boost application failed:", boostError);
              }
            } else {
              // Le joueur a atteint sa limite mensuelle de boosts
              boostError = canUse.reason || "Tu as atteint la limite mensuelle de 10 boosts";
              console.warn("⚠️ Boost cannot be used (monthly limit reached):", boostError);
            }
          } else {
            boostError = "Tu n'as plus de boosts disponibles";
            console.warn("⚠️ Boost requested but no credits available");
          }
        } else {
          // Le joueur a atteint sa limite quotidienne de matchs
          boostError = "Le boost ne peut pas être appliqué car tu as déjà atteint ta limite de 2 matchs par jour";
          console.warn("⚠️ Boost requested but player has reached daily match limit");
        }
      } else {
        boostError = "Le boost ne peut être utilisé que si tu gagnes le match";
        console.warn("⚠️ Boost requested but player lost:", user.id);
      }
      } else {
        boostError = "Joueur non trouvé parmi les participants";
        console.error("❌ Boost requested but player not found in participants");
      }
    }

  // Si un boost a été appliqué, attendre un peu et vérifier qu'il est bien visible dans la base de données
  // avant de revalider les pages (pour éviter des problèmes de timing)
  if (boostApplied && match?.id) {
    console.log("⏳ Waiting for boost to be fully committed to database...");
    await new Promise(resolve => setTimeout(resolve, 500)); // Augmenter à 500ms pour être sûr
    
    // Vérifier que le boost est bien enregistré dans la base de données
    // Essayer plusieurs fois si nécessaire
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
        console.error(`❌ Error verifying boost (attempt ${attempt + 1}):`, error);
      } else if (data) {
        verifyBoost = data;
        console.log(`✅ Boost verified in database (attempt ${attempt + 1}):`, {
          matchId: verifyBoost.match_id?.substring(0, 8),
          pointsAfterBoost: verifyBoost.points_after_boost,
          appliedAt: verifyBoost.applied_at,
          userId: verifyBoost.user_id?.substring(0, 8)
        });
        break;
      } else {
        console.warn(`⚠️ Boost not found in database (attempt ${attempt + 1})`);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Attendre 200ms de plus
        }
      }
    }
    
    if (!verifyBoost) {
      console.error("❌ CRITICAL: Boost not found in database after multiple attempts - this will cause incorrect point calculation!");
    }
  }

  try {
    console.log("🔄 Revalidating paths after match submission...");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/historique");
    revalidatePath("/dashboard/classement");
    revalidatePath("/dashboard/membres");
    revalidatePath("/challenges");
    revalidatePath("/"); // Page d'accueil avec les points
    revalidatePath("/matches/history"); // Historique des matchs
    revalidatePath("/boost"); // Page des boosts
    console.log("✅ All paths revalidated, including /, /matches/history, and /boost");
  } catch (revalidateError) {
    console.warn("⚠️ Failed to revalidate pages after match submission", revalidateError);
  }

  console.log("✅ Match submission completed successfully");
  
  // Préparer la réponse avec avertissement si nécessaire
  let responseMessage = "Match enregistré avec succès.";
  let warning: string | null = null;
  
  if (playersOverLimit.length > 0) {
    // Récupérer les noms des joueurs qui ont atteint la limite
    const { data: overLimitProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .in("id", playersOverLimit);
    
    const overLimitNames = (overLimitProfiles || [])
      .map((p: any) => p.display_name || "Ce joueur")
      .join(", ");
    
    if (playersOverLimit.length === userPlayers.length) {
      // Tous les joueurs ont atteint la limite
      warning = `Attention : Tu as déjà enregistré 2 matchs aujourd'hui. Ce match a été enregistré mais aucun point ne sera ajouté à ton classement.`;
    } else if (playersOverLimit.length === 1 && playersOverLimit[0] === user.id) {
      // Seulement le joueur connecté a atteint la limite
      warning = `Attention : Tu as déjà enregistré 2 matchs aujourd'hui. Ce match a été enregistré mais aucun point ne sera ajouté à ton classement. Les autres joueurs recevront leurs points normalement.`;
    } else {
      // Plusieurs joueurs ont atteint la limite
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
    console.error("❌ Unexpected error in match submission:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
