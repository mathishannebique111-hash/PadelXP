import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase non configuré côté serveur" },
      { status: 500 }
    );
  }

  const supabaseAdmin = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const [{ count: profileCount, error: profileError }, { count: guestCount, error: guestError }] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("guest_players").select("id", { count: "exact", head: true }),
      ]);

    if (profileError) {
      console.error("[public/stats] profile count error:", profileError);
    }
    if (guestError) {
      console.error("[public/stats] guest count error:", guestError);
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startIso = startOfMonth.toISOString();

    const [
      { count: matchesCount, error: matchesError },
      { data: activeParticipants, error: participantsError },
    ] = await Promise.all([
      supabaseAdmin
        .from("matches")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startIso),
      supabaseAdmin
        .from("match_participants")
        .select("user_id, matches!inner(created_at)")
        .gte("matches.created_at", startIso),
    ]);

    if (matchesError) {
      console.error("[public/stats] matches count error:", matchesError);
    }
    if (participantsError) {
      console.error("[public/stats] participants error:", participantsError);
    }

    const uniqueActivePlayers = new Set(
      (activeParticipants || [])
        .map((p: any) => p.user_id)
        .filter(
          (id: string) => id && id !== "00000000-0000-0000-0000-000000000000"
        )
    );

    return NextResponse.json(
      {
        totalPlayers: (profileCount || 0) + (guestCount || 0),
        activePlayers: uniqueActivePlayers.size,
        totalMatches: matchesCount || 0,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[public/stats] unexpected error:", error);
    return NextResponse.json(
      { error: "Erreur lors du calcul des statistiques" },
      { status: 500 }
    );
  }
}

