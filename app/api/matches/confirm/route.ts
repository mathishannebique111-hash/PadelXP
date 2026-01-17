import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  return NextResponse.json({ message: "Use POST method" }, { status: 405 });
}

export async function POST(req: Request) {
  try {
    logger.info("POST /api/matches/confirm - Starting");

    const body = await req.json();
    const { matchId } = body as { matchId?: string };

    logger.info("POST /api/matches/confirm - Body parsed", { matchId });

    if (!matchId) {
      return NextResponse.json({ error: "matchId requis" }, { status: 400 });
    }

    // Get cookies and create auth client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // Ignore cookie setting errors
            }
          },
        },
      }
    );

    logger.info("POST /api/matches/confirm - Getting user");
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      logger.error("POST /api/matches/confirm - User error", { error: userError.message });
      return NextResponse.json({ error: "Erreur d'authentification", details: userError.message }, { status: 401 });
    }

    if (!user) {
      logger.error("POST /api/matches/confirm - No user");
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    logger.info("POST /api/matches/confirm - User found", { userId: user.id.substring(0, 8) + "…" });

    // Create admin client
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if match exists
    logger.info("POST /api/matches/confirm - Checking match exists");
    const { data: match, error: matchError } = await adminClient
      .from("matches")
      .select("id, status")
      .eq("id", matchId)
      .maybeSingle();

    if (matchError) {
      logger.error("POST /api/matches/confirm - Match query error", { error: matchError.message });
      return NextResponse.json({ error: "Erreur lors de la recherche du match", details: matchError.message }, { status: 500 });
    }

    if (!match) {
      logger.error("POST /api/matches/confirm - Match not found");
      return NextResponse.json({ error: "Match non trouvé" }, { status: 404 });
    }

    logger.info("POST /api/matches/confirm - Match found", { status: match.status });

    if (match.status === 'confirmed') {
      return NextResponse.json({
        success: true,
        message: "Ce match est déjà confirmé",
        alreadyConfirmed: true
      });
    }

    // Upsert the confirmation
    logger.info("POST /api/matches/confirm - Upserting confirmation");
    const { error: upsertError } = await adminClient
      .from("match_confirmations")
      .upsert({
        match_id: matchId,
        user_id: user.id,
        confirmed: true,
        confirmed_at: new Date().toISOString(),
        confirmation_token: crypto.randomUUID()
      }, {
        onConflict: 'match_id,user_id'
      });

    if (upsertError) {
      logger.error("POST /api/matches/confirm - Upsert error", { error: upsertError.message });
      return NextResponse.json({ error: "Erreur lors de la confirmation", details: upsertError.message }, { status: 500 });
    }

    logger.info("POST /api/matches/confirm - Confirmation upserted");

    // Count confirmations
    const { data: confirmations } = await adminClient
      .from("match_confirmations")
      .select("id")
      .eq("match_id", matchId)
      .eq("confirmed", true);

    const confirmationCount = confirmations?.length || 0;
    logger.info("POST /api/matches/confirm - Confirmation count", { count: confirmationCount });

    // Règle simplifiée : 3 confirmations requises (sur 4 joueurs)
    const totalUserParticipants = 3;

    // Fetch the updated match status (the trigger might have already confirmed it)
    const { data: updatedMatch } = await adminClient
      .from("matches")
      .select("status")
      .eq("id", matchId)
      .maybeSingle();

    const isConfirmed = updatedMatch?.status === 'confirmed';

    if (isConfirmed) {
      return NextResponse.json({
        success: true,
        message: "Match confirmé ! Les points ont été ajoutés au classement.",
        matchConfirmed: true,
        confirmationCount,
        totalRequired: 3
      });
    }

    return NextResponse.json({
      success: true,
      message: "Confirmation enregistrée. En attente des autres joueurs.",
      matchConfirmed: false,
      confirmationCount,
      confirmationsNeeded: Math.max(0, 3 - confirmationCount),
      totalRequired: 3
    });

  } catch (error) {
    logger.error("POST /api/matches/confirm - Unexpected error", {
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    return NextResponse.json({
      error: "Erreur serveur inattendue",
      details: (error as Error).message
    }, { status: 500 });
  }
}
