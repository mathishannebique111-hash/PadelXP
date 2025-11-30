import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { scheduleMatches } from "@/lib/tournaments/tournament-engine";
import type { Tournament } from "@/lib/types/tournaments";

export async function POST(
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

    // Vérifier admin club
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (tournamentError || !tournament) {
      logger.warn({ 
        tournamentId: id.substring(0, 8) + "…"
      }, "Tournament not found");
      
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const { data: clubAdmin } = await supabase
      .from('club_admins')
      .select('club_id')
      .eq('user_id', user.id)
      .eq('club_id', tournament.club_id)
      .not('activated_at', 'is', null)
      .single();

    if (!clubAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Vérifier statut
    if (tournament.status !== 'draw_published' && tournament.status !== 'in_progress') {
      logger.warn({ 
        tournamentId: id.substring(0, 8) + "…",
        currentStatus: tournament.status
      }, "Invalid tournament status for scheduling");
      
      return NextResponse.json({ 
        error: 'Tournament must have a published draw' 
      }, { status: 400 });
    }

    // Vérifier qu'il y a des matchs
    const { count, error: countError } = await supabase
      .from('tournament_matches')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', id);

    if (countError) {
      logger.error({ 
        tournamentId: id.substring(0, 8) + "…",
        error: countError.message
      }, "Error counting matches");
      
      return NextResponse.json({ 
        error: 'Error checking matches' 
      }, { status: 500 });
    }

    if (!count || count === 0) {
      logger.warn({ 
        tournamentId: id.substring(0, 8) + "…"
      }, "No matches found");
      
      return NextResponse.json({ 
        error: 'No matches found. Generate draw first.' 
      }, { status: 400 });
    }

    logger.info({ 
      tournamentId: id.substring(0, 8) + "…",
      totalMatches: count,
      courts: tournament.available_courts
    }, "Starting match scheduling");

    // Planifier les matchs
    await scheduleMatches(tournament as Tournament);

    // Mettre à jour statut tournoi si pas déjà in_progress
    if (tournament.status !== 'in_progress') {
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({ status: 'in_progress' })
        .eq('id', id);

      if (updateError) {
        logger.error({ 
          tournamentId: id.substring(0, 8) + "…",
          error: updateError.message
        }, "Error updating tournament status");
        
        return NextResponse.json({ 
          error: 'Error updating tournament status' 
        }, { status: 500 });
      }
    }

    logger.info({ 
      tournamentId: id.substring(0, 8) + "…",
      matchesScheduled: count,
      startDate: tournament.start_date
    }, "Matches scheduled successfully");

    return NextResponse.json({ 
      success: true,
      matchesScheduled: count,
      startDate: tournament.start_date,
      courts: tournament.available_courts
    });

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error) 
    }, "Error scheduling matches");
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

