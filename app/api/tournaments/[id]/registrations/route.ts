import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const createRegistrationSchema = z.object({
  player_name: z.string().min(1),
  player_rank: z.number().int().positive(),
  partner_name: z.string().min(1),
  partner_rank: z.number().int().positive(),
});

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
      .select("club_id, max_teams")
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

    const activeTeams = enriched.filter(
      (r) => r.status === "pending" || r.status === "validated"
    ).length;

    const maxTeams =
      typeof tournament.max_teams === "number" ? tournament.max_teams : null;

    logger.info(
      {
        tournamentId: id.substring(0, 8) + "…",
        userId: user.id.substring(0, 8) + "…",
        count: enriched.length,
        activeTeams,
        maxTeams,
      },
      "[dashboard/registrations] Registrations fetched"
    );

    return NextResponse.json({
      registrations: enriched,
      currentTeams: activeTeams,
      maxTeams,
      isFull:
        maxTeams !== null && typeof maxTeams === "number"
          ? activeTeams >= maxTeams
          : false,
    });
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

export async function POST(
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
      .select("club_id, max_teams")
      .eq("id", id)
      .single();

    if (tournamentError || !tournament) {
      logger.warn(
        {
          tournamentId: id.substring(0, 8) + "…",
          error: tournamentError?.message,
        },
        "[dashboard/registrations] Tournament not found (POST)"
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
          "[dashboard/registrations] club_admins lookup failed (POST)"
        );
      }
      if (clubAdmin) {
        isClubAdmin = true;
      }
    }

    if (!isClubAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = createRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn(
        {
          tournamentId: id.substring(0, 8) + "…",
          errors: parsed.error.errors,
        },
        "[dashboard/registrations] Invalid manual registration data"
      );

      return NextResponse.json(
        { error: "Données d'inscription manuelle invalides" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Admin client not configured" },
        { status: 500 }
      );
    }

    const { player_name, player_rank, partner_name, partner_rank } = parsed.data;

    // Vérifier la capacité maximale avant toute création
    if (supabaseAdmin) {
      const { count: activeCount, error: countError } = await supabaseAdmin
        .from("tournament_registrations")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", id)
        .in("status", ["pending", "confirmed", "validated"]);

      if (countError) {
        logger.warn(
          {
            tournamentId: id.substring(0, 8) + "…",
            userId: user.id.substring(0, 8) + "…",
            error: countError.message,
          },
          "[dashboard/registrations] Could not count active registrations (POST)"
        );
      } else if (
        typeof tournament.max_teams === "number" &&
        tournament.max_teams > 0 &&
        typeof activeCount === "number" &&
        activeCount >= tournament.max_teams
      ) {
        return NextResponse.json(
          {
            error:
              "Le nombre maximum d'équipes est déjà atteint pour ce tournoi.",
          },
          { status: 400 }
        );
      }
    }

    // Récupérer l'ordre actuel pour placer la nouvelle inscription à la fin
    const { data: existingRegs, error: regsError } = await supabaseAdmin
      .from("tournament_registrations")
      .select("registration_order")
      .eq("tournament_id", id);

    if (regsError) {
      logger.warn(
        {
          tournamentId: id.substring(0, 8) + "…",
          error: regsError.message,
        },
        "[dashboard/registrations] Error fetching existing registrations (POST)"
      );
    }

    const nextOrder =
      (existingRegs || [])
        .map((r: any) => r.registration_order as number | null)
        .filter((v): v is number => typeof v === "number")
        .reduce((max, v) => (v > max ? v : max), 0) + 1;

    // Créer deux profils "invités" pour les joueurs hors ligne,
    // afin de pouvoir remplir les colonnes NOT NULL player1_id / player2_id.
    const guestPlayer1Id = randomUUID();
    const guestPlayer2Id = randomUUID();

    const { error: guest1Error } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: guestPlayer1Id,
        display_name: player_name,
      });

    if (guest1Error) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          userId: user.id.substring(0, 8) + "…",
          error: guest1Error.message,
          code: guest1Error.code,
        },
        "[dashboard/registrations] Error creating guest profile for player 1"
      );

      return NextResponse.json(
        {
          error:
            "Erreur lors de la création du profil invité pour le joueur 1.",
        },
        { status: 500 }
      );
    }

    const { error: guest2Error } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: guestPlayer2Id,
        display_name: partner_name,
      });

    if (guest2Error) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          userId: user.id.substring(0, 8) + "…",
          error: guest2Error.message,
          code: guest2Error.code,
        },
        "[dashboard/registrations] Error creating guest profile for player 2"
      );

      return NextResponse.json(
        {
          error:
            "Erreur lors de la création du profil invité pour le joueur 2.",
        },
        { status: 500 }
      );
    }

    const pairTotalRank = player_rank + partner_rank;

    // Tentative d'insertion complète (toutes les colonnes si la migration est appliquée)
    let inserted = null;
    let insertError: any = null;

    const firstInsert = await supabaseAdmin
      .from("tournament_registrations")
      .insert({
        tournament_id: id,
        player1_id: guestPlayer1Id,
        player2_id: guestPlayer2Id,
        player1_name: player_name,
        player1_rank: player_rank,
        player2_name: partner_name,
        player2_rank: partner_rank,
        pair_total_rank: pairTotalRank,
        pair_weight: pairTotalRank,
        registration_order: nextOrder,
        status: "pending",
        phase: "waiting_list",
      })
      .select()
      .maybeSingle();

    inserted = firstInsert.data;
    insertError = firstInsert.error;

    // Si certaines colonnes optionnelles (ex: pair_weight) n'existent pas encore,
    // on refait une insertion plus minimale sans ces colonnes.
    if ((!inserted || insertError) && insertError?.code === "42703") {
      logger.warn(
        {
          tournamentId: id.substring(0, 8) + "…",
          userId: user.id.substring(0, 8) + "…",
          error: insertError.message,
        },
        "[dashboard/registrations] Optional columns missing on tournament_registrations, retrying minimal insert (POST)"
      );

      const fallbackInsert = await supabaseAdmin
        .from("tournament_registrations")
        .insert({
          tournament_id: id,
          player1_name: player_name,
          player1_rank: player_rank,
          player2_name: partner_name,
          player2_rank: partner_rank,
          pair_total_rank: pairTotalRank,
          registration_order: nextOrder,
          status: "pending",
        })
        .select()
        .maybeSingle();

      inserted = fallbackInsert.data;
      insertError = fallbackInsert.error;
    }

    if (insertError || !inserted) {
      logger.error(
        {
          tournamentId: id.substring(0, 8) + "…",
          userId: user.id.substring(0, 8) + "…",
          error: insertError?.message,
          code: insertError?.code,
          details: insertError?.details,
        },
        "[dashboard/registrations] Error inserting manual registration"
      );

      return NextResponse.json(
        {
          error:
            insertError?.message ||
            "Erreur lors de la création de l'inscription",
          code: insertError?.code,
        },
        { status: 500 }
      );
    }

    logger.info(
      {
        tournamentId: id.substring(0, 8) + "…",
        userId: user.id.substring(0, 8) + "…",
        registrationId: inserted.id
          ? String(inserted.id).substring(0, 8) + "…"
          : undefined,
      },
      "[dashboard/registrations] Manual registration created"
    );

    return NextResponse.json({ registration: inserted });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "[dashboard/registrations] Unexpected error (POST)"
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


