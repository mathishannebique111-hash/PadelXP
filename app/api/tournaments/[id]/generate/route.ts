import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { 
  rankRegisteredPairs, 
  assignSeeds, 
  generateKnockoutBracket, 
  generatePools 
} from "@/lib/tournaments/tournament-engine";
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
    if (tournament.status !== 'registration_closed') {
      logger.warn({ 
        tournamentId: id.substring(0, 8) + "…",
        currentStatus: tournament.status
      }, "Invalid tournament status for generation");
      
      return NextResponse.json({ 
        error: 'Tournament must be in registration_closed status' 
      }, { status: 400 });
    }

    // Vérifier qu'il n'y a pas déjà des matchs générés
    const { count: existingMatches } = await supabase
      .from('tournament_matches')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', id);

    if (existingMatches && existingMatches > 0) {
      logger.warn({ 
        tournamentId: id.substring(0, 8) + "…",
        existingMatches
      }, "Matches already generated");
      
      return NextResponse.json({ 
        error: 'Draw already generated. Delete existing matches first.' 
      }, { status: 400 });
    }

    // Classer les paires
    const rankedPairs = await rankRegisteredPairs(id);
    
    if (rankedPairs.length === 0) {
      logger.warn({ 
        tournamentId: id.substring(0, 8) + "…"
      }, "No confirmed registrations found");
      
      return NextResponse.json({ 
        error: 'No confirmed registrations found' 
      }, { status: 400 });
    }

    logger.info({ 
      tournamentId: id.substring(0, 8) + "…",
      numPairs: rankedPairs.length,
      tournamentType: tournament.tournament_type
    }, "Starting tournament generation");

    // Assigner têtes de série
    await assignSeeds(id, rankedPairs);

    // Générer selon le type
    let matchesCreated = 0;

    switch (tournament.tournament_type) {
      case 'official_knockout':
        await generateKnockoutBracket(tournament as Tournament, rankedPairs);
        // Pour un tableau à élimination directe, on a N-1 matchs (N paires)
        matchesCreated = rankedPairs.length - 1;
        break;

      case 'official_pools':
        await generatePools(tournament as Tournament, rankedPairs);
        // Calculer matchs de poules
        const poolSize = tournament.pool_size || 4;
        const numPools = Math.ceil(rankedPairs.length / poolSize);
        // 4 équipes = 6 matchs (toutes contre toutes), 3 équipes = 3 matchs
        matchesCreated = numPools * (poolSize === 4 ? 6 : 3);
        break;

      case 'americano':
      case 'mexicano':
        // TODO: Implémenter génération Americano/Mexicano en Phase 3
        logger.warn({ 
          tournamentId: id.substring(0, 8) + "…",
          tournamentType: tournament.tournament_type
        }, "Americano/Mexicano not implemented");
        
        return NextResponse.json({ 
          error: 'Americano/Mexicano not implemented yet' 
        }, { status: 501 });

      default:
        logger.warn({ 
          tournamentId: id.substring(0, 8) + "…",
          tournamentType: tournament.tournament_type
        }, "Invalid tournament type");
        
        return NextResponse.json({ 
          error: 'Invalid tournament type' 
        }, { status: 400 });
    }

    // Mettre à jour statut tournoi
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({ 
        status: 'draw_published',
        draw_publication_date: new Date().toISOString()
      })
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

    const seedsCount = rankedPairs.filter(p => p.is_seed).length;

    logger.info({ 
      tournamentId: id.substring(0, 8) + "…",
      matchesCreated,
      seeds: seedsCount,
      totalPairs: rankedPairs.length
    }, "Tournament generated successfully");

    return NextResponse.json({ 
      success: true,
      matchesCreated,
      seeds: seedsCount,
      totalPairs: rankedPairs.length
    }, { status: 201 });

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error) 
    }, "Error generating tournament");
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

