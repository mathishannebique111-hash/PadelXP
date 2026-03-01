import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlayerChallenges } from "@/lib/challenges";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { challenges, isPremiumUser } = await getPlayerChallenges(user.id);
    return NextResponse.json({ challenges, isPremiumUser });
  } catch (error) {
    console.error("[api/player/challenges] GET Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
