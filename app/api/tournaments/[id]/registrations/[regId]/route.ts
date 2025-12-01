import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { z } from "zod";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const updateRegistrationSchema = z.object({
  action: z.enum(["validate", "reject"]).optional(),
  player_name: z.string().optional(),
  player_rank: z.number().int().positive().optional(),
  partner_name: z.string().optional(),
  partner_rank: z.number().int().positive().optional(),
  player_license: z.string().optional(),
  partner_license: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; regId: string } }
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

    const { id, regId } = params;

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

    // Vérifier que l'utilisateur est admin du club via supabaseAdmin
    let isClubAdmin = false;
    if (supabaseAdmin) {
      const { data: clubAdmin } = await supabaseAdmin
        .from("club_admins")
        .select("club_id")
        .eq("user_id", user.id)
        .eq("club_id", tournament.club_id)
        .not("activated_at", "is", null)
        .maybeSingle();
      if (clubAdmin) {
        isClubAdmin = true;
      }
    }

    if (!isClubAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = updateRegistrationSchema.safeParse(body);

    if (!result.success) {
      logger.warn(
        {
          tournamentId: id.substring(0, 8) + "…",
          registrationId: regId.substring(0, 8) + "…",
          errors: result.error.errors,
        },
        "[dashboard/registrations] Invalid registration update data"
      );

      return NextResponse.json(
        { error: "Invalid registration update data" },
        { status: 400 }
      );
    }

    const data = result.data;

    // Récupérer l'inscription actuelle pour recalculer pair_total_rank si nécessaire
    const { data: currentRegistration } = await supabaseAdmin
      .from("tournament_registrations")
      .select("player1_rank, player2_rank, pair_total_rank")
      .eq("id", regId)
      .single();

    // Construire les données d'update
    const updateData: any = {};
    if (data.player_name !== undefined) {
      updateData.player1_name = data.player_name;
    }
    if (data.player_rank !== undefined) {
      updateData.player1_rank = data.player_rank;
    }
    if (data.partner_name !== undefined) {
      updateData.player2_name = data.partner_name;
    }
    if (data.partner_rank !== undefined) {
      updateData.player2_rank = data.partner_rank;
    }
    if (data.action) {
      updateData.status = data.action === "validate" ? "confirmed" : "rejected";
    }

    // Recalculer pair_total_rank si un des classements a changé
    const newPlayer1Rank = data.player_rank ?? currentRegistration?.player1_rank;
    const newPlayer2Rank = data.partner_rank ?? currentRegistration?.player2_rank;
    if (newPlayer1Rank && newPlayer2Rank) {
      updateData.pair_total_rank = newPlayer1Rank + newPlayer2Rank;
      updateData.pair_weight = newPlayer1Rank + newPlayer2Rank; // Mettre à jour aussi pair_weight
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Admin client not configured" },
        { status: 500 }
      );
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("tournament_registrations")
      .update(updateData)
      .eq("id", regId)
      .eq("tournament_id", id)
      .select()
      .maybeSingle();

    if (updateError) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          registrationId: regId.substring(0, 8) + "…",
          userId: user.id.substring(0, 8) + "…",
          error: updateError.message,
        },
        "[dashboard/registrations] Error updating registration"
      );

      return NextResponse.json(
        { error: "Error updating registration" },
        { status: 500 }
      );
    }

    logger.info(
      {
        tournamentId: id.substring(0, 8) + "…",
        registrationId: regId.substring(0, 8) + "…",
        userId: user.id.substring(0, 8) + "…",
        updates: Object.keys(updateData),
      },
      "[dashboard/registrations] Registration updated"
    );

    return NextResponse.json({ registration: updated });
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

