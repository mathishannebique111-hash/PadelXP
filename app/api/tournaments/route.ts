import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { z } from 'zod';

const createTournamentSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().optional(),
  category: z.string(),
  tournament_type: z.enum(['official_knockout', 'official_pools', 'americano', 'mexicano', 'custom']),
  match_format: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E', 'F']),
  pool_size: z.number().int().min(3).max(4).optional(),
  pool_format: z.string().optional(),
  num_pools: z.number().int().optional(),
  main_draw_size: z.number().int().optional(),
  num_seeds: z.number().int().optional(),
  num_wild_cards: z.number().int().optional(),
  punto_de_oro: z.boolean().default(false),
  coaching_allowed: z.boolean().default(true),
  registration_open_date: z.string(),
  registration_close_date: z.string(),
  draw_publication_date: z.string().optional(),
  start_date: z.string(),
  end_date: z.string(),
  available_courts: z.array(z.number().int()),
  match_duration_minutes: z.number().int().default(90),
  inscription_fee: z.number().min(0).max(20),
  prize_money: z.any().optional(),
  stripe_product_id: z.string().optional(),
});

// GET /api/tournaments
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Récupérer les tournois du club de l'utilisateur
    const { data: clubAdmin } = await supabase
      .from('club_admins')
      .select('club_id')
      .eq('user_id', user.id)
      .not('activated_at', 'is', null)
      .single();

    if (!clubAdmin) {
      return NextResponse.json({ error: 'Not a club admin' }, { status: 403 });
    }

    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('club_id', clubAdmin.club_id)
      .order('start_date', { ascending: false });

    if (error) {
      logger.error({ 
        userId: user.id.substring(0, 8) + "…",
        clubId: clubAdmin.club_id.substring(0, 8) + "…",
        error: error.message 
      }, "Error fetching tournaments");
      
      return NextResponse.json({ error: 'Error fetching tournaments' }, { status: 500 });
    }

    logger.info({ 
      userId: user.id.substring(0, 8) + "…",
      clubId: clubAdmin.club_id.substring(0, 8) + "…",
      count: tournaments?.length || 0
    }, "Tournaments fetched");

    return NextResponse.json({ tournaments });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Unexpected error");
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tournaments
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin d'un club
    const { data: clubAdmin } = await supabase
      .from('club_admins')
      .select('club_id')
      .eq('user_id', user.id)
      .not('activated_at', 'is', null)
      .single();

    if (!clubAdmin) {
      return NextResponse.json({ error: 'Not a club admin' }, { status: 403 });
    }

    const body = await request.json();
    const result = createTournamentSchema.safeParse(body);

    if (!result.success) {
      logger.warn({ 
        userId: user.id.substring(0, 8) + "…",
        errors: result.error.errors 
      }, "Invalid tournament data");
      
      return NextResponse.json({ error: result.error.errors }, { status: 400 });
    }

    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({
        ...result.data,
        club_id: clubAdmin.club_id,
        created_by: user.id,
        status: 'draft'
      })
      .select()
      .single();

    if (error) {
      logger.error({ 
        userId: user.id.substring(0, 8) + "…",
        clubId: clubAdmin.club_id.substring(0, 8) + "…",
        error: error.message 
      }, "Error creating tournament");
      
      return NextResponse.json({ error: 'Error creating tournament' }, { status: 500 });
    }

    logger.info({ 
      userId: user.id.substring(0, 8) + "…",
      tournamentId: tournament.id.substring(0, 8) + "…",
      name: result.data.name
    }, "Tournament created");

    return NextResponse.json({ tournament }, { status: 201 });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Unexpected error");
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

