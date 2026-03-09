import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const { matchFinderId } = await req.json();

    if (!matchFinderId) {
      return NextResponse.json({ error: "matchFinderId required" }, { status: 400 });
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

    // 1. Fetch match finder entry and current participants
    const { data: match, error: fetchError } = await supabase
      .from("match_finder")
      .select(`
        *,
        participants:match_finder_participants(user_id)
      `)
      .eq("id", matchFinderId)
      .single();

    if (fetchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (match.status !== 'open') {
        return NextResponse.json({ error: "Ce match n'est plus disponible" }, { status: 400 });
    }

    // 2. Check if user is already a participant
    const isAlreadyPart = match.participants.some((p: any) => p.user_id === user.id);
    if (isAlreadyPart) {
        return NextResponse.json({ error: "Vous participez déjà à ce match" }, { status: 400 });
    }

    // 3. Check slots (Total slots = 1 creator + needed_players)
    // Actually the user said "indicates how many players he is looking for (1, 2 or 3)"
    // And "s'il ne recherche qu'un seul joueur les deux autres places soient bloquées"
    // So if needed = 1, total participants allowed = Creator + 1 = 2.
    // If needed = 2, total participants allowed = Creator + 2 = 3.
    // If needed = 3, total participants allowed = Creator + 3 = 4.
    // Wait, the UI shows 4 places. "on doit voir les 4 places avec les joueurs déjà inscrits".
    // This implies 4 slots total. If needed < 3, the remaining slots are "blocked" (maybe guests?).
    // Let's assume the max capacity of the match_finder_participants is (needed_players + 1) where +1 is creator.
    const currentParticipantCount = match.participants.length;
    const maxAllowed = match.needed_players + 1;

    if (currentParticipantCount >= maxAllowed) {
        return NextResponse.json({ error: "Ce match est déjà complet" }, { status: 400 });
    }

    // 4. Validate Level
    const { data: profile } = await supabase
      .from("profiles")
      .select("niveau_padel, display_name, first_name, last_name")
      .eq("id", user.id)
      .single();

    const userLevel = profile?.niveau_padel || 1.0;
    if (userLevel < match.min_level || userLevel > match.max_level) {
        return NextResponse.json({ 
            error: "Vous n'avez pas le niveau requis pour rejoindre ce match",
            required: `${match.min_level} - ${match.max_level}`,
            your_level: userLevel
        }, { status: 403 });
    }

    // 5. Join
    const { error: joinError } = await supabase
      .from("match_finder_participants")
      .insert({
        match_finder_id: matchFinderId,
        user_id: user.id
      });

    if (joinError) {
        logger.error("Error joining match finder", { joinError });
        return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
    }

    // 6. Notifications
    const existingParticipants = match.participants.map((p: any) => p.user_id);
    const joinerName = profile?.display_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || "Un joueur";

    for (const participantId of existingParticipants) {
        await supabase.from("notifications").insert({
            user_id: participantId,
            type: "match_finder_join",
            title: "Nouveau joueur !",
            message: `${joinerName} a rejoint votre match du ${new Date(match.scheduled_at).toLocaleDateString("fr-FR")} à ${new Date(match.scheduled_at).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}`,
            data: {
                match_finder_id: matchFinderId,
                joiner_id: user.id
            },
            is_read: false
        });
    }

    // Check if match is now full
    if (currentParticipantCount + 1 === maxAllowed) {
        await supabase.from("match_finder").update({ status: 'completed' }).eq("id", matchFinderId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Unexpected error in Match Finder Join POST", { error });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
