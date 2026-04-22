import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* read-only */ },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET: get debrief for a match, or list pending debriefs
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const matchId = req.nextUrl.searchParams.get("matchId");
  const admin = getAdmin();

  if (matchId) {
    // Get specific debrief
    const { data } = await admin
      .from("match_debriefs")
      .select("*")
      .eq("user_id", user.id)
      .eq("match_id", matchId)
      .maybeSingle();

    return NextResponse.json({ debrief: data });
  }

  // List matches without debrief (last 5 confirmed matches)
  const { data: participations } = await admin
    .from("match_participants")
    .select("match_id")
    .eq("user_id", user.id)
    .eq("player_type", "user");

  if (!participations || participations.length === 0) {
    return NextResponse.json({ pending: [] });
  }

  const matchIds = participations.map((p) => p.match_id);

  const { data: confirmedMatches } = await admin
    .from("matches")
    .select("id, score_team1, score_team2, played_at")
    .in("id", matchIds)
    .eq("status", "confirmed")
    .order("played_at", { ascending: false })
    .limit(5);

  if (!confirmedMatches || confirmedMatches.length === 0) {
    return NextResponse.json({ pending: [] });
  }

  // Filter out matches that already have debriefs
  const { data: existingDebriefs } = await admin
    .from("match_debriefs")
    .select("match_id")
    .eq("user_id", user.id)
    .in("match_id", confirmedMatches.map((m) => m.id));

  const debriefedIds = new Set((existingDebriefs || []).map((d) => d.match_id));
  const pending = confirmedMatches.filter((m) => !debriefedIds.has(m.id));

  return NextResponse.json({ pending });
}

// POST: submit a debrief
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { matchId, ratingService, ratingVolley, ratingSmash, ratingDefense, ratingMental, problemShot, sidePlayed, notes } = body;

  if (!matchId) {
    return NextResponse.json({ error: "matchId requis" }, { status: 400 });
  }

  const admin = getAdmin();

  const { data, error } = await admin
    .from("match_debriefs")
    .upsert({
      user_id: user.id,
      match_id: matchId,
      rating_service: ratingService || null,
      rating_volley: ratingVolley || null,
      rating_smash: ratingSmash || null,
      rating_defense: ratingDefense || null,
      rating_mental: ratingMental || null,
      problem_shot: problemShot || null,
      side_played: sidePlayed || null,
      notes: notes || null,
    }, { onConflict: "user_id,match_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ debrief: data });
}
