import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const matchFinderSchema = z.object({
  club_id: z.string().uuid(),
  scheduled_at: z.string(),
  min_level: z.number().min(1).max(10),
  max_level: z.number().min(1).max(10),
  needed_players: z.number().int().min(1).max(3),
  description: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clubId = searchParams.get("club_id");

    if (!clubId) {
      return NextResponse.json({ error: "club_id required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch open matches for the club
    const { data: matches, error } = await supabase
      .from("match_finder")
      .select(`
        *,
        creator:profiles!match_finder_creator_id_fkey(id, display_name, first_name, last_name, padel_level),
        participants:match_finder_participants(
          user_id,
          profiles(id, display_name, first_name, last_name, padel_level)
        )
      `)
      .eq("club_id", clubId)
      .eq("status", "open")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });

    if (error) {
      logger.error("Error fetching match finder entries", { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(matches);
  } catch (error) {
    logger.error("Unexpected error in Match Finder GET", { error });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = matchFinderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.format() }, { status: 400 });
    }

    const { data: match, error } = await supabase
      .from("match_finder")
      .insert({
        ...parsed.data,
        creator_id: user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating match finder entry", { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-join the creator as a participant? 
    // Actually, the UI will show 4 slots total (1 creator + 1-3 needed).
    // Let's keep match_finder_participants for OTHERS joining.
    // The creator is implicit but we can add them to participants for consistency if needed.
    // The requirement says "indicates how many players he is looking for (1, 2 or 3)".
    // So if he looks for 2, there are 4 slots total: Creator + 1 friend (not in system yet maybe?) + 2 needed?
    // "quand on clique sur le cadre du match on doit voir les 4 places avec les joueurs déjà inscrits"
    // So if I seek 2 players, I am already 1, and 1 slot is "blocked" or "friend".
    // Wait, "s'il ne recherche qu'un seul joueur les deux autres places soient bloquées".
    // This means 4 slots total. 
    // If needed = 1 -> Creator + 2 blocked + 1 sought.
    // If needed = 2 -> Creator + 1 blocked + 2 sought.
    // If needed = 3 -> Creator + 3 sought.
    
    await supabase.from("match_finder_participants").insert({
        match_finder_id: match.id,
        user_id: user.id
    });

    return NextResponse.json(match);
  } catch (error) {
    logger.error("Unexpected error in Match Finder POST", { error });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
