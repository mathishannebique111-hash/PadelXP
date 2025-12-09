import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const setScoreSchema = z.object({
  team1: z.number().int().min(0),
  team2: z.number().int().min(0),
  tiebreak: z.object({
    team1: z.number().int().min(0),
    team2: z.number().int().min(0),
  }).optional()
});

const matchScoreSchema = z.object({
  sets: z.array(setScoreSchema).min(1).max(3),
  super_tiebreak: z.object({
    team1: z.number().int().min(0),
    team2: z.number().int().min(0),
  }).optional(),
  punto_de_oro_used: z.boolean().default(false),
});

const updateMatchSchema = z.object({
  score: matchScoreSchema,
  status: z.enum(['in_progress', 'completed']).optional(),
  actual_start_time: z.string().optional(),
  actual_end_time: z.string().optional(),
});

// Fonction helper : Déterminer le vainqueur
function determineWinner(
  score: z.infer<typeof matchScoreSchema>,
  team1Id: string | null,
  team2Id: string | null
): string | null {
  if (!team1Id || !team2Id) {
    return null;
  }

  let team1Sets = 0;
  let team2Sets = 0;

  for (const set of score.sets) {
    if (set.team1 > set.team2) {
      team1Sets++;
    } else if (set.team2 > set.team1) {
      team2Sets++;
    }
    // En cas d'égalité, aucun set n'est attribué
  }

  // Super tie-break
  if (score.super_tiebreak) {
    if (score.super_tiebreak.team1 > score.super_tiebreak.team2) {
      team1Sets++;
    } else if (score.super_tiebreak.team2 > score.super_tiebreak.team1) {
      team2Sets++;
    }
  }

  // Déterminer vainqueur (majorité de sets)
  if (team1Sets > team2Sets) {
    return team1Id;
  } else if (team2Sets > team1Sets) {
    return team2Id;
  }

  return null; // Match pas terminé ou égalité
}

// Fonction helper : Formater le score
function formatScore(score: z.infer<typeof matchScoreSchema>): string {
  const sets = score.sets.map((s) => {
    let str = `${s.team1}-${s.team2}`;
    if (s.tiebreak) {
      str += ` (${s.tiebreak.team1}-${s.tiebreak.team2})`;
    }
    return str;
  });

  if (score.super_tiebreak) {
    sets.push(`[${score.super_tiebreak.team1}-${score.super_tiebreak.team2}]`);
  }

  return sets.join(', ');
}

// Fonction helper : Avancer le vainqueur au match suivant
async function advanceWinner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nextMatchId: string,
  position: 'team1' | 'team2' | null,
  winnerId: string
) {
  if (!position) {
    logger.warn({ 
      nextMatchId: nextMatchId.substring(0, 8) + "…"
    }, "No position specified for next match");
    return;
  }

  const updates = position === 'team1' 
    ? { team1_registration_id: winnerId }
    : { team2_registration_id: winnerId };

  const { error } = await supabase
    .from('tournament_matches')
    .update(updates)
    .eq('id', nextMatchId);

  if (error) {
    logger.error({ 
      nextMatchId: nextMatchId.substring(0, 8) + "…",
      position,
      error: error.message
    }, "Error advancing winner");
  } else {
    logger.info({ 
      nextMatchId: nextMatchId.substring(0, 8) + "…",
      position,
      winnerId: winnerId.substring(0, 8) + "…"
    }, "Winner advanced to next match");
  }
}

// GET /api/tournaments/[id]/matches/[matchId]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; matchId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, matchId } = params;

    const { data: match, error } = await supabase
      .from('tournament_matches')
      .select(`
        *,
        team1:tournament_registrations!tournament_matches_team1_registration_id_fkey(
          id,
          player1_id,
          player2_id,
          player1:profiles!tournament_registrations_player1_id_fkey(id, first_name, last_name),
          player2:profiles!tournament_registrations_player2_id_fkey(id, first_name, last_name)
        ),
        team2:tournament_registrations!tournament_matches_team2_registration_id_fkey(
          id,
          player1_id,
          player2_id,
          player1:profiles!tournament_registrations_player1_id_fkey(id, first_name, last_name),
          player2:profiles!tournament_registrations_player2_id_fkey(id, first_name, last_name)
        )
      `)
      .eq('id', matchId)
      .eq('tournament_id', id)
      .single();

    if (error || !match) {
      logger.warn({ 
        tournamentId: id.substring(0, 8) + "…",
        matchId: matchId.substring(0, 8) + "…"
      }, "Match not found");
      
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    logger.info({ 
      tournamentId: id.substring(0, 8) + "…",
      matchId: matchId.substring(0, 8) + "…"
    }, "Match fetched");

    return NextResponse.json({ match });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Unexpected error");
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/tournaments/[id]/matches/[matchId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; matchId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, matchId } = params;

    if (!supabaseAdmin) {
      logger.error(
        {},
        "[matches/update] Admin client not configured (missing service role key)"
      );
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const adminClient = supabaseAdmin;

    // Vérifier admin club (en bypassant la RLS avec le client admin)
    const { data: tournament, error: tournamentError } = await adminClient
      .from("tournaments")
      .select("club_id, match_format")
      .eq("id", id)
      .single();

    if (tournamentError || !tournament) {
      logger.warn({ 
        tournamentId: id.substring(0, 8) + "…"
      }, "Tournament not found");
      
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const { data: clubAdmin } = await adminClient
      .from("club_admins")
      .select("club_id")
      .eq("user_id", user.id)
      .eq("club_id", tournament.club_id)
      .not("activated_at", "is", null)
      .maybeSingle();

    if (!clubAdmin || clubAdmin.club_id !== tournament.club_id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Récupérer le match actuel
    const { data: currentMatch, error: matchError } = await adminClient
      .from("tournament_matches")
      .select("*")
      .eq("id", matchId)
      .eq("tournament_id", id)
      .single();

    if (matchError || !currentMatch) {
      logger.warn({ 
        tournamentId: id.substring(0, 8) + "…",
        matchId: matchId.substring(0, 8) + "…"
      }, "Match not found");
      
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const body = await request.json();
    const result = updateMatchSchema.safeParse(body);
    
    if (!result.success) {
      logger.warn({ 
        tournamentId: id.substring(0, 8) + "…",
        matchId: matchId.substring(0, 8) + "…",
        errors: result.error.errors
      }, "Invalid match update data");
      
      return NextResponse.json({ error: result.error.errors }, { status: 400 });
    }

    // Valider le score selon le format du tournoi
    const scoreValidationError = validateScoreByFormat(
      tournament.match_format as any,
      result.data.score
    );
    if (scoreValidationError) {
      return NextResponse.json({ error: scoreValidationError }, { status: 400 });
    }

    // Déterminer le vainqueur
    const winnerId = determineWinner(
      result.data.score,
      currentMatch.team1_registration_id,
      currentMatch.team2_registration_id
    );

    // Calculer le score final formaté
    const finalScore = formatScore(result.data.score);

    // Mettre à jour le match
    const updates: any = {
      score: result.data.score,
      winner_registration_id: winnerId,
      status: result.data.status || (winnerId ? 'completed' : 'in_progress'),
    };

    if (result.data.actual_start_time) {
      updates.actual_start_time = result.data.actual_start_time;
    }

    if (result.data.actual_end_time) {
      updates.actual_end_time = result.data.actual_end_time;
    } else if (winnerId) {
      // Si match terminé, enregistrer la date de fin
      updates.actual_end_time = new Date().toISOString();
    }

    const { data: match, error: updateError } = await adminClient
      .from("tournament_matches")
      .update(updates)
      .eq("id", matchId)
      .eq("tournament_id", id)
      .select()
      .single();

    if (updateError) {
      logger.error({ 
        tournamentId: id.substring(0, 8) + "…",
        matchId: matchId.substring(0, 8) + "…",
        error: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      }, "Error updating match");
      
      return NextResponse.json(
        { error: updateError.message || 'Error updating match' },
        { status: 500 }
      );
    }

    // Si match complété et qu'il a un next_match, avancer le vainqueur
    if (updates.status === 'completed' && currentMatch.next_match_id && winnerId) {
      await advanceWinner(
        supabase,
        currentMatch.next_match_id,
        currentMatch.next_match_position as 'team1' | 'team2' | null,
        winnerId
      );
    }

    logger.info({ 
      tournamentId: id.substring(0, 8) + "…",
      matchId: matchId.substring(0, 8) + "…",
      winnerId: winnerId?.substring(0, 8) + "…" || null,
      finalScore
    }, "Match score updated");

    return NextResponse.json({ match });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Unexpected error");
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Validation des scores par format
function validateScoreByFormat(
  format: 'A1' | 'B1' | 'C1' | 'D1' | string,
  score: z.infer<typeof matchScoreSchema>
): string | null {
  const sets = score.sets || [];
  const superTb = score.super_tiebreak;

  // Helpers
  const checkSets = (maxGames: number) =>
    sets.every((s) => s.team1 >= 0 && s.team2 >= 0 && s.team1 <= maxGames && s.team2 <= maxGames);
  const countSetsWon = () => {
    let t1 = 0;
    let t2 = 0;
    sets.forEach((s) => {
      if (s.team1 > s.team2) t1++;
      else if (s.team2 > s.team1) t2++;
    });
    return { t1, t2 };
  };

  switch (format) {
    case 'A1': {
      // 2 sets minimum, 3 sets maximum, jeux ≤7
      if (sets.length < 2 || sets.length > 3) {
        return "Format A1 : 2 ou 3 sets à 6 jeux sont requis.";
      }
      if (!checkSets(7)) {
        return "Format A1 : chaque set doit être ≤ 7 jeux.";
      }
      const { t1, t2 } = countSetsWon();
      // Super tie-break autorisé seulement si 1-1 après deux sets, sinon interdit
      if (superTb) {
        if (sets.length !== 2) {
          return "Format A1 : super tie-break uniquement en troisième manche après 1-1.";
        }
        if (!(t1 === 1 && t2 === 1)) {
          return "Format A1 : super tie-break seulement si chaque équipe a gagné un set (1-1).";
        }
        // Validation du super tie-break : minimum 10 points pour une équipe, écart de 2 points minimum
        const maxScore = Math.max(superTb.team1, superTb.team2);
        const minScore = Math.min(superTb.team1, superTb.team2);
        const diff = Math.abs(superTb.team1 - superTb.team2);
        if (maxScore < 10) {
          return "Format A1 : le super tie-break doit avoir un minimum de 10 points pour une équipe.";
        }
        if (diff < 2) {
          return "Format A1 : le super tie-break doit avoir un écart minimum de 2 points.";
        }
        if (superTb.team1 === superTb.team2) {
          return "Format A1 : le super tie-break ne peut pas être égal.";
        }
      } else {
        // Sans super tie-break, on doit avoir 3 sets et un vainqueur clair
        if (sets.length !== 3) {
          return "Format A1 : sans super tie-break, 3 sets sont requis.";
        }
        if (t1 === t2) {
          return "Format A1 : un vainqueur doit se dégager après 3 sets.";
        }
      }
      return null;
    }
    case 'B1': {
      if (sets.length !== 2) {
        return "Format B1 : exactement 2 sets à 6 jeux.";
      }
      if (!checkSets(7)) {
        return "Format B1 : chaque set doit être ≤ 7 jeux.";
      }
      const { t1, t2 } = countSetsWon();
      if (t1 === 2 || t2 === 2) {
        // Victoire 2-0 : pas de super tie-break
        if (superTb) {
          return "Format B1 : pas de super tie-break en cas de victoire 2-0.";
        }
      } else if (t1 === 1 && t2 === 1) {
        // 1-1 : super tie-break obligatoire
        if (!superTb) {
          return "Format B1 : super tie-break obligatoire en cas de 1-1.";
        }
        // Validation du super tie-break : minimum 10 points pour une équipe, écart de 2 points minimum
        const maxScore = Math.max(superTb.team1, superTb.team2);
        const minScore = Math.min(superTb.team1, superTb.team2);
        const diff = Math.abs(superTb.team1 - superTb.team2);
        if (maxScore < 10) {
          return "Format B1 : le super tie-break doit avoir un minimum de 10 points pour une équipe.";
        }
        if (diff < 2) {
          return "Format B1 : le super tie-break doit avoir un écart minimum de 2 points.";
        }
        if (superTb.team1 === superTb.team2) {
          return "Format B1 : le super tie-break ne peut pas être égal.";
        }
      } else {
        return "Format B1 : les sets doivent déterminer un score 2-0 ou 1-1 avant super tie-break.";
      }
      return null;
    }
    case 'C1': {
      if (sets.length !== 2) {
        return "Format C1 : exactement 2 sets à 4 jeux.";
      }
      if (!checkSets(5)) {
        return "Format C1 : chaque set doit être ≤ 5 jeux.";
      }
      if (!superTb) {
        return "Format C1 : un super tie-break (10 pts) est requis.";
      }
      // Validation du super tie-break : minimum 10 points pour une équipe, écart de 2 points minimum
      const minScore = Math.min(superTb.team1, superTb.team2);
      const maxScore = Math.max(superTb.team1, superTb.team2);
      const diff = Math.abs(superTb.team1 - superTb.team2);
      if (maxScore < 10) {
        return "Format C1 : le super tie-break doit avoir un minimum de 10 points pour une équipe.";
      }
      if (diff < 2) {
        return "Format C1 : le super tie-break doit avoir un écart minimum de 2 points.";
      }
      if (superTb.team1 === superTb.team2) {
        return "Format C1 : le super tie-break ne peut pas être égal.";
      }
      return null;
    }
    case 'D1': {
      if (sets.length !== 1) {
        return "Format D1 : exactement 1 set à 9 jeux.";
      }
      if (!checkSets(9)) {
        return "Format D1 : le set doit être ≤ 9 jeux.";
      }
      if (superTb) {
        return "Format D1 : pas de super tie-break.";
      }
      return null;
    }
    default:
      // Ne rien bloquer pour les autres formats
      return null;
  }
}

