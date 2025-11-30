import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { calculatePairWeight } from "@/lib/tournaments/tournament-engine";
import { z } from 'zod';

const registerSchema = z.object({
  player2_id: z.string().uuid(),
  player1_classification: z.string().optional(),
  player2_classification: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Auth
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // 2. Valider body
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      logger.warn({ 
        userId: user.id.substring(0, 8) + "…",
        errors: result.error.errors 
      }, "Invalid registration data");
      
      return NextResponse.json({ error: result.error.errors }, { status: 400 });
    }

    // 3. Vérifier tournoi existe et inscriptions ouvertes
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (tournamentError || !tournament) {
      logger.warn({ 
        userId: user.id.substring(0, 8) + "…",
        tournamentId: id.substring(0, 8) + "…"
      }, "Tournament not found");
      
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.status !== 'open') {
      logger.warn({ 
        userId: user.id.substring(0, 8) + "…",
        tournamentId: id.substring(0, 8) + "…",
        status: tournament.status
      }, "Registrations closed");
      
      return NextResponse.json({ error: 'Registrations are closed' }, { status: 400 });
    }

    // Vérifier que les dates d'inscription sont valides
    const now = new Date();
    const openDate = new Date(tournament.registration_open_date);
    const closeDate = new Date(tournament.registration_close_date);

    if (now < openDate || now > closeDate) {
      logger.warn({ 
        userId: user.id.substring(0, 8) + "…",
        tournamentId: id.substring(0, 8) + "…",
        now: now.toISOString(),
        openDate: openDate.toISOString(),
        closeDate: closeDate.toISOString()
      }, "Registration period not open");
      
      return NextResponse.json({ 
        error: 'Registration period is not open' 
      }, { status: 400 });
    }

    // Vérifier que les deux joueurs sont différents
    if (user.id === result.data.player2_id) {
      return NextResponse.json({ 
        error: 'Cannot register with yourself' 
      }, { status: 400 });
    }

    // Vérifier qu'il n'y a pas déjà une inscription pour cette paire
    const { data: existingRegistration } = await supabase
      .from('tournament_registrations')
      .select('id')
      .eq('tournament_id', id)
      .or(`and(player1_id.eq.${user.id},player2_id.eq.${result.data.player2_id}),and(player1_id.eq.${result.data.player2_id},player2_id.eq.${user.id})`)
      .maybeSingle();

    if (existingRegistration) {
      logger.warn({ 
        userId: user.id.substring(0, 8) + "…",
        player2Id: result.data.player2_id.substring(0, 8) + "…",
        tournamentId: id.substring(0, 8) + "…"
      }, "Pair already registered");
      
      return NextResponse.json({ 
        error: 'This pair is already registered' 
      }, { status: 400 });
    }

    // 4. Calculer poids de paire
    const pairWeight = await calculatePairWeight(user.id, result.data.player2_id);

    // 5. Compter les inscriptions existantes pour order
    const { count } = await supabase
      .from('tournament_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', id);

    // 6. Créer inscription
    const { data: registration, error } = await supabase
      .from('tournament_registrations')
      .insert({
        tournament_id: id,
        player1_id: user.id,
        player2_id: result.data.player2_id,
        player1_classification: result.data.player1_classification,
        player2_classification: result.data.player2_classification,
        pair_weight: pairWeight,
        registration_order: (count || 0) + 1,
        status: 'pending', // Statut initial : pending, l'admin validera
        payment_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      logger.error({ 
        userId: user.id.substring(0, 8) + "…",
        tournamentId: id.substring(0, 8) + "…",
        error: error.message 
      }, "Error creating registration");
      
      return NextResponse.json({ error: 'Error creating registration' }, { status: 500 });
    }

    logger.info({ 
      userId: user.id.substring(0, 8) + "…",
      tournamentId: id.substring(0, 8) + "…",
      registrationId: registration.id.substring(0, 8) + "…",
      pairWeight
    }, "Registration created");

    return NextResponse.json({ registration }, { status: 201 });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Unexpected error");
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

