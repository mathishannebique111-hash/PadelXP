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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
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

    // Lire et valider rapidement le body
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body facultatif, mais on forcera les champs obligatoires ci-dessous
    }

    const player_license = (body?.player_license ?? "").toString().trim();
    const partner_name = (body?.partner_name ?? "").toString().trim();
    const partner_license = (body?.partner_license ?? "").toString().trim();

    if (!player_license || !partner_name || !partner_license) {
      return NextResponse.json(
        { error: "Merci de remplir toutes les informations obligatoires." },
        { status: 400 }
      );
    }

    // Récupérer le profil joueur (d'abord avec le client utilisateur)
    let profile: { id: string } | null = null;
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logger.warn(
        {
          userId: user.id.substring(0, 8) + "…",
          error: profileError?.message,
        },
        "[tournaments/register] Error fetching profile with user client (ignored, will try admin)"
      );
    } else if (profileData) {
      profile = profileData;
    }

    // Si pas de profil trouvé, essayer avec le client admin (bypass RLS)
    if (!profile && supabaseAdmin) {
      const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (adminProfileError) {
        logger.warn(
          {
            userId: user.id.substring(0, 8) + "…",
            error: adminProfileError?.message,
          },
          "[tournaments/register] Error fetching profile with admin client"
        );
      } else if (adminProfile) {
        profile = adminProfile;
      }
    }

    if (!profile) {
      logger.warn(
        {
          userId: user.id.substring(0, 8) + "…",
        },
        "[tournaments/register] User profile not found"
      );
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 400 }
      );
    }

    // Vérifier tournoi + statut
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, status, registration_open_date, registration_close_date")
      .eq("id", id)
      .single();

    if (tournamentError || !tournament) {
      logger.warn(
        {
          userId: user.id.substring(0, 8) + "…",
          tournamentId: id.substring(0, 8) + "…",
          error: tournamentError?.message,
        },
        "[tournaments/register] Tournament not found"
      );
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 }
      );
    }

    if (tournament.status !== "open") {
      logger.warn(
        {
          userId: user.id.substring(0, 8) + "…",
          tournamentId: id.substring(0, 8) + "…",
          status: tournament.status,
        },
        "[tournaments/register] Tournament is not open for registration"
      );
      return NextResponse.json(
        { error: "Tournament is not open for registration" },
        { status: 400 }
      );
    }

    const now = new Date();
    const openDate = new Date(tournament.registration_open_date);
    const closeDate = new Date(tournament.registration_close_date);

    if (now < openDate || now > closeDate) {
      logger.warn(
        {
          userId: user.id.substring(0, 8) + "…",
          tournamentId: id.substring(0, 8) + "…",
          now: now.toISOString(),
          openDate: openDate.toISOString(),
          closeDate: closeDate.toISOString(),
        },
        "[tournaments/register] Registration period not open"
      );
      return NextResponse.json(
        { error: "Registration period is not open" },
        { status: 400 }
      );
    }

    // Vérifier inscription existante (un joueur par tournoi)
    const { data: existing, error: existingError } = await supabase
      .from("tournament_participants")
      .select("id")
      .eq("tournament_id", id)
      .eq("player_id", profile.id)
      .maybeSingle();

    if (existingError) {
      logger.error(
        {
          userId: user.id.substring(0, 8) + "…",
          tournamentId: id.substring(0, 8) + "…",
          error: existingError.message,
        },
        "[tournaments/register] Error checking existing registration"
      );
      return NextResponse.json(
        { error: "Unable to check existing registration" },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: "Already registered" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      logger.error(
        {},
        "[tournaments/register] Supabase admin client not configured"
      );
      return NextResponse.json(
        { error: "Registration service not available" },
        { status: 500 }
      );
    }

    // Création de l'entrée dans tournament_participants
    const { data: participant, error: insertError } = await supabaseAdmin
      .from("tournament_participants")
      .insert({
        tournament_id: id,
        player_id: profile.id,
        // Colonnes supplémentaires à ajouter via migration si non présentes:
        // player_license TEXT, partner_name TEXT, partner_license TEXT
        player_license,
        partner_name,
        partner_license,
      })
      .select()
      .single();

    if (insertError || !participant) {
      logger.error(
        {
          userId: user.id.substring(0, 8) + "…",
          tournamentId: id.substring(0, 8) + "…",
          error: insertError?.message,
        },
        "[tournaments/register] Error creating participant"
      );
      return NextResponse.json(
        { error: "Error creating registration" },
        { status: 500 }
      );
    }

    logger.info(
      {
        userId: user.id.substring(0, 8) + "…",
        tournamentId: id.substring(0, 8) + "…",
        participantId: participant.id.substring(0, 8) + "…",
      },
      "[tournaments/register] Registration created"
    );

    return NextResponse.json({ registration: participant }, { status: 201 });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "[tournaments/register] Unexpected error"
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

