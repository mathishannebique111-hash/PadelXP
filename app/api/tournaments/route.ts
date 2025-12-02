import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { z } from 'zod';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const createTournamentSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().optional(),
  category: z.string(),
  tournament_type: z.enum([
    "official_knockout",
    "tmc",
    "double_elimination",
    "official_pools",
    "pools_triple_draw",
    "round_robin",
    "americano",
    "mexicano",
    "custom",
  ]),
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
  max_teams: z.number().int().min(4).max(64).optional(),
  prize_money: z.any().optional(),
  stripe_product_id: z.string().optional(),
});

// GET /api/tournaments
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin d'un club (utiliser supabaseAdmin pour bypass RLS)
    let clubId: string | null = null;
    if (supabaseAdmin) {
      const { data: clubAdmin } = await supabaseAdmin
        .from('club_admins')
        .select('club_id')
        .eq('user_id', user.id)
        .not('activated_at', 'is', null)
        .maybeSingle();
      
      if (clubAdmin?.club_id) {
        clubId = clubAdmin.club_id as string;
      }
    }

    // Fallback : chercher dans profiles si pas trouvé dans club_admins
    if (!clubId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('club_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profile?.club_id) {
        clubId = profile.club_id;
      }
    }

    if (!clubId) {
      return NextResponse.json({ error: 'Not a club admin' }, { status: 403 });
    }

    // Récupérer le profil pour created_by (FK vers profiles.id)
    let createdBy: string | null = null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    
    if (profile?.id) {
      createdBy = profile.id;
    } else {
      logger.warn(
        { userId: user.id.substring(0, 8) + "…" },
        "User profile not found for tournament creation, using null created_by"
      );
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

    // Utiliser supabaseAdmin pour l'insert si disponible, sinon supabase
    const client = supabaseAdmin || supabase;
    
    const { data: tournament, error } = await client
      .from('tournaments')
      .insert({
        ...result.data,
        club_id: clubId,
        created_by: createdBy,
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

