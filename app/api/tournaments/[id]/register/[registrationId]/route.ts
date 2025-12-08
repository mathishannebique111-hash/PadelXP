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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; registrationId: string }> }
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

    const { id, registrationId } = await params;

    if (!supabaseAdmin) {
      logger.error(
        {
          hasUrl: !!SUPABASE_URL,
          hasKey: !!SERVICE_ROLE_KEY,
        },
        "[tournaments/register/cancel] Supabase admin client not configured"
      );
      return NextResponse.json(
        { error: "Service d'annulation non disponible" },
        { status: 500 }
      );
    }

    // Vérifier que l'inscription existe et appartient à l'utilisateur
    const { data: registration, error: regError } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id, tournament_id, player1_id, status")
      .eq("id", registrationId)
      .eq("tournament_id", id)
      .single();

    if (regError || !registration) {
      logger.warn(
        {
          userId: user.id.substring(0, 8) + "…",
          tournamentId: id.substring(0, 8) + "…",
          registrationId: registrationId.substring(0, 8) + "…",
          error: regError?.message,
        },
        "[tournaments/register/cancel] Registration not found"
      );
      return NextResponse.json(
        { error: "Inscription introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que l'inscription appartient à l'utilisateur
    if (registration.player1_id !== user.id) {
      logger.warn(
        {
          userId: user.id.substring(0, 8) + "…",
          registrationId: registrationId.substring(0, 8) + "…",
          ownerId: registration.player1_id.substring(0, 8) + "…",
        },
        "[tournaments/register/cancel] User does not own this registration"
      );
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à annuler cette inscription" },
        { status: 403 }
      );
    }

    // Vérifier que l'inscription peut être annulée (pas si déjà validée ou si le tournoi a commencé)
    const { data: tournament, error: tournamentError } = await supabaseAdmin
      .from("tournaments")
      .select("id, status")
      .eq("id", id)
      .single();

    if (tournamentError || !tournament) {
      logger.warn(
        {
          tournamentId: id.substring(0, 8) + "…",
          error: tournamentError?.message,
        },
        "[tournaments/register/cancel] Tournament not found"
      );
      return NextResponse.json(
        { error: "Tournoi introuvable" },
        { status: 404 }
      );
    }

    // Ne pas permettre l'annulation si le tournoi a déjà commencé ou si l'inscription est validée
    if (
      tournament.status === "in_progress" ||
      tournament.status === "completed" ||
      registration.status === "validated"
    ) {
      return NextResponse.json(
        {
          error:
            "Cette inscription ne peut pas être annulée car le tournoi a déjà commencé ou votre inscription a été validée.",
        },
        { status: 400 }
      );
    }

    // Supprimer l'inscription
    const { error: deleteError } = await supabaseAdmin
      .from("tournament_registrations")
      .delete()
      .eq("id", registrationId)
      .eq("player1_id", user.id);

    if (deleteError) {
      logger.error(
        {
          userId: user.id.substring(0, 8) + "…",
          registrationId: registrationId.substring(0, 8) + "…",
          error: deleteError.message,
        },
        "[tournaments/register/cancel] Error deleting registration"
      );
      return NextResponse.json(
        { error: "Erreur lors de l'annulation de l'inscription" },
        { status: 500 }
      );
    }

    logger.info(
      {
        userId: user.id.substring(0, 8) + "…",
        tournamentId: id.substring(0, 8) + "…",
        registrationId: registrationId.substring(0, 8) + "…",
      },
      "[tournaments/register/cancel] Registration cancelled successfully"
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      "[tournaments/register/cancel] Unexpected error"
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message || "Erreur interne du serveur"
            : "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
}

