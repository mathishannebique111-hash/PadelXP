import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Vérifier que le tournoi existe
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("club_id")
      .eq("id", id)
      .single();

    if (tournamentError || !tournament) {
      logger.warn(
        {
          tournamentId: id.substring(0, 8) + "…",
          error: tournamentError?.message,
        },
        "[dashboard/registrations] Tournament not found"
      );

      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur est admin du club via supabaseAdmin (bypass RLS éventuelle)
    let isClubAdmin = false;
    if (supabaseAdmin) {
      const { data: clubAdmin, error: clubAdminError } = await supabaseAdmin
        .from("club_admins")
        .select("club_id")
        .eq("user_id", user.id)
        .eq("club_id", tournament.club_id)
        .not("activated_at", "is", null)
        .maybeSingle();

      if (clubAdminError) {
        logger.warn(
          {
            userId: user.id.substring(0, 8) + "…",
            tournamentId: id.substring(0, 8) + "…",
            error: clubAdminError.message,
          },
          "[dashboard/registrations] club_admins lookup failed"
        );
      }
      if (clubAdmin) {
        isClubAdmin = true;
      }
    }

    if (!isClubAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Choisir le client le plus permissif pour lire les inscriptions
    const client = supabaseAdmin || supabase;

    // Lire les inscriptions depuis tournament_registrations (paires)
    const { data: registrations, error } = await client
      .from("tournament_registrations")
      .select(
        `
        id,
        tournament_id,
        player1_id,
        player2_id,
        player1_name,
        player1_rank,
        player2_name,
        player2_rank,
        pair_total_rank,
        seed_number,
        status,
        registration_order,
        created_at
      `
      )
      .eq("tournament_id", id)
      .order("registration_order", { ascending: true });

    if (error) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          userId: user.id.substring(0, 8) + "…",
          error: error.message,
        },
        "[dashboard/registrations] Error fetching registrations"
      );

      return NextResponse.json(
        { error: "Error fetching registrations" },
        { status: 500 }
      );
    }

    const enriched =
      registrations?.map((r: any) => {
        const rawStatus = (r.status as string | undefined) || "pending";
        const status =
          rawStatus === "pending" ||
          rawStatus === "confirmed" ||
          rawStatus === "validated" ||
          rawStatus === "rejected"
            ? rawStatus === "confirmed" ? "validated" : rawStatus
            : "pending";

        return {
          id: r.id,
          player_id: r.player1_id,
          player_name: r.player1_name || "Inconnu",
          player_rank: r.player1_rank ?? null,
          player_license: null, // Pas stocké dans tournament_registrations
          partner_name: r.player2_name || null,
          partner_rank: r.player2_rank ?? null,
          partner_license: null, // Pas stocké dans tournament_registrations
          pair_total_rank: r.pair_total_rank ?? null,
          seed_number: r.seed_number ?? null,
          status: status as "pending" | "validated" | "rejected",
          created_at: r.created_at,
        };
      }) || [];

    logger.info(
      {
        tournamentId: id.substring(0, 8) + "…",
        userId: user.id.substring(0, 8) + "…",
        count: enriched.length,
      },
      "[dashboard/registrations] Registrations fetched"
    );

    return NextResponse.json({ registrations: enriched });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "[dashboard/registrations] Unexpected error"
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

