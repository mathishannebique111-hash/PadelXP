import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from 'zod';

const updateTournamentSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  tournament_type: z.enum(['official_knockout', 'official_pools', 'americano', 'mexicano', 'custom']).optional(),
  match_format: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E', 'F']).optional(),
  pool_size: z.number().int().min(3).max(4).optional(),
  pool_format: z.string().optional(),
  num_pools: z.number().int().optional(),
  main_draw_size: z.number().int().optional(),
  num_seeds: z.number().int().optional(),
  num_wild_cards: z.number().int().optional(),
  punto_de_oro: z.boolean().optional(),
  coaching_allowed: z.boolean().optional(),
  registration_open_date: z.string().optional(),
  registration_close_date: z.string().optional(),
  draw_publication_date: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  available_courts: z.array(z.number().int()).optional(),
  match_duration_minutes: z.number().int().optional(),
  inscription_fee: z.number().min(0).max(20).optional(),
  prize_money: z.any().optional(),
  stripe_product_id: z.string().optional(),
  status: z.enum(['draft', 'open', 'registration_closed', 'draw_published', 'in_progress', 'completed', 'cancelled']).optional(),
});

// GET /api/tournaments/[id]
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

    // Récupérer le tournoi
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !tournament) {
      logger.warn({ 
        userId: user.id.substring(0, 8) + "…",
        tournamentId: id.substring(0, 8) + "…",
        error: error?.message 
      }, "Tournament not found");
      
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est admin du club du tournoi
    const { data: clubAdmin } = await supabase
      .from('club_admins')
      .select('club_id')
      .eq('user_id', user.id)
      .eq('club_id', tournament.club_id)
      .not('activated_at', 'is', null)
      .single();

    if (!clubAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    logger.info({ 
      userId: user.id.substring(0, 8) + "…",
      tournamentId: id.substring(0, 8) + "…"
    }, "Tournament fetched");

    return NextResponse.json({ tournament });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Unexpected error");
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/tournaments/[id]
export async function PATCH(
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

    // Vérifier que le tournoi existe et que l'utilisateur est admin
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('club_id, status')
      .eq('id', id)
      .single();

    if (tournamentError || !tournament) {
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = updateTournamentSchema.safeParse(body);

    if (!result.success) {
      logger.warn({ 
        userId: user.id.substring(0, 8) + "…",
        tournamentId: id.substring(0, 8) + "…",
        errors: result.error.errors 
      }, "Invalid tournament update data");
      
      return NextResponse.json({ error: result.error.errors }, { status: 400 });
    }

    const { data: updatedTournament, error: updateError } = await supabase
      .from('tournaments')
      .update(result.data)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error({ 
        userId: user.id.substring(0, 8) + "…",
        tournamentId: id.substring(0, 8) + "…",
        error: updateError.message 
      }, "Error updating tournament");
      
      return NextResponse.json({ error: 'Error updating tournament' }, { status: 500 });
    }

    logger.info({ 
      userId: user.id.substring(0, 8) + "…",
      tournamentId: id.substring(0, 8) + "…"
    }, "Tournament updated");

    return NextResponse.json({ tournament: updatedTournament });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Unexpected error");
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tournaments/[id]
export async function DELETE(
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

    // Vérifier que le tournoi existe et que l'utilisateur est admin
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('club_id, status')
      .eq('id', id)
      .single();

    if (tournamentError || !tournament) {
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ne pas permettre la suppression si le tournoi est en cours ou terminé
    if (tournament.status === 'in_progress' || tournament.status === 'completed') {
      logger.warn({ 
        userId: user.id.substring(0, 8) + "…",
        tournamentId: id.substring(0, 8) + "…",
        status: tournament.status
      }, "Attempt to delete active/completed tournament");
      
      return NextResponse.json({ 
        error: 'Cannot delete tournament that is in progress or completed' 
      }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error({ 
        userId: user.id.substring(0, 8) + "…",
        tournamentId: id.substring(0, 8) + "…",
        error: deleteError.message 
      }, "Error deleting tournament");
      
      return NextResponse.json({ error: 'Error deleting tournament' }, { status: 500 });
    }

    logger.info({ 
      userId: user.id.substring(0, 8) + "…",
      tournamentId: id.substring(0, 8) + "…"
    }, "Tournament deleted");

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Unexpected error");
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

