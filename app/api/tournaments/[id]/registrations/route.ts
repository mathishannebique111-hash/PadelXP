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

    // IMPORTANT : les inscriptions joueur actuelles sont stockées dans
    // tournament_participants (un joueur par tournoi). On lit donc cette table.
    // On tente d'abord avec les colonnes optionnelles (licences, statut),
    // puis on retombe sur une forme minimale si ces colonnes n'existent pas.
    let registrations: any[] | null = null;
    let error: any = null;

    const firstSelect = await client
      .from("tournament_participants")
      .select(
        `
        id,
        tournament_id,
        player_id,
        created_at,
        status,
        player_license,
        partner_name,
        partner_license,
        player:profiles!tournament_participants_player_id_fkey(id, first_name, last_name, display_name)
      `
      )
      .eq("tournament_id", id)
      .order("created_at", { ascending: true });

    registrations = firstSelect.data;
    error = firstSelect.error;

    if (error && error.code === "42703") {
      // Colonnes manquantes : relancer une requête minimale
      logger.warn(
        {
          tournamentId: id.substring(0, 8) + "…",
          error: error.message,
        },
        "[dashboard/registrations] Optional columns missing on tournament_participants, falling back to minimal select"
      );

      const fallback = await client
        .from("tournament_participants")
        .select(
          `
          id,
          tournament_id,
          player_id,
          created_at,
          player:profiles!tournament_participants_player_id_fkey(id, first_name, last_name, display_name)
        `
        )
        .eq("tournament_id", id)
        .order("created_at", { ascending: true });

      registrations = fallback.data;
      error = fallback.error;
    }

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
        const p = r.player || {};
        const player_name =
          p.display_name ||
          [p.first_name, p.last_name].filter(Boolean).join(" ") ||
          "Inconnu";

        const rawStatus = (r.status as string | undefined) || "validated";
        const status =
          rawStatus === "pending" ||
          rawStatus === "validated" ||
          rawStatus === "rejected"
            ? rawStatus
            : "validated";

        return {
          id: r.id,
          player_id: r.player_id,
          player_name,
          player_license: r.player_license ?? null,
          partner_name: r.partner_name ?? null,
          partner_license: r.partner_license ?? null,
          status,
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

