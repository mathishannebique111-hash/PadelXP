import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      logger.warn("[PreferencesUpdate] Pas d'utilisateur connecté");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { play_style, preferred_frequency, looking_for_partner } = body;

    // Validation
    if (play_style && !['attacker', 'defender', 'balanced'].includes(play_style)) {
      return NextResponse.json({ error: "play_style invalide" }, { status: 400 });
    }

    if (preferred_frequency && !['casual', 'regular', 'intensive'].includes(preferred_frequency)) {
      return NextResponse.json({ error: "preferred_frequency invalide" }, { status: 400 });
    }

    const updateData: any = {
      player_id: user.id,
      updated_at: new Date().toISOString()
    };

    if (play_style !== undefined) {
      updateData.play_style = play_style;
    }

    if (preferred_frequency !== undefined) {
      updateData.preferred_frequency = preferred_frequency;
    }

    if (looking_for_partner !== undefined) {
      updateData.looking_for_partner = looking_for_partner;
    }

    const { data, error } = await supabase
      .from('player_preferences')
      .upsert(updateData, {
        onConflict: 'player_id'
      })
      .select()
      .single();

    if (error) {
      logger.error("[PreferencesUpdate] Erreur mise à jour préférences", { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info("[PreferencesUpdate] Préférences mises à jour", {
      userId: user.id.substring(0, 8),
      play_style,
      preferred_frequency,
      looking_for_partner
    });

    return NextResponse.json({ success: true, preferences: data });
  } catch (error) {
    logger.error("[PreferencesUpdate] Erreur inattendue", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
