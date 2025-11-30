import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Paramètres de filtrage optionnels
    const { searchParams } = new URL(request.url);
    const roundType = searchParams.get('round_type');
    const status = searchParams.get('status');
    const poolId = searchParams.get('pool_id');

    let query = supabase
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
      .eq('tournament_id', id);

    // Appliquer filtres
    if (roundType) {
      query = query.eq('round_type', roundType);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (poolId) {
      query = query.eq('pool_id', poolId);
    }

    // Trier par scheduled_time, puis par round_number et match_order
    query = query
      .order('scheduled_time', { ascending: true, nullsFirst: false })
      .order('round_number', { ascending: true, nullsFirst: false })
      .order('match_order', { ascending: true, nullsFirst: false });

    const { data: matches, error } = await query;

    if (error) {
      logger.error({ 
        tournamentId: id.substring(0, 8) + "…",
        userId: user.id.substring(0, 8) + "…",
        error: error.message 
      }, "Error fetching matches");
      
      return NextResponse.json({ error: 'Error fetching matches' }, { status: 500 });
    }

    logger.info({ 
      tournamentId: id.substring(0, 8) + "…",
      userId: user.id.substring(0, 8) + "…",
      count: matches?.length || 0,
      filters: { roundType, status, poolId }
    }, "Matches fetched");

    return NextResponse.json({ matches });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Unexpected error");
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

