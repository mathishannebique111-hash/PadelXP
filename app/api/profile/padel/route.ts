import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("level, preferred_side, hand, frequency, best_shot, postal_code, city")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      level: profile?.level || null,
      preferred_side: profile?.preferred_side || null,
      hand: profile?.hand || null,
      frequency: profile?.frequency || null,
      best_shot: profile?.best_shot || null,
      postal_code: profile?.postal_code || null,
      city: profile?.city || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
