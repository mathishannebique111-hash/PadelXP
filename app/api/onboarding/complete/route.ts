import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Serveur mal configuré" }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const { answers, skip } = body;

    const serviceClient = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Préparer les données à mettre à jour
    const updateData: any = {
      has_completed_onboarding: true,
    };

    // Si ce n'est pas un skip, ajouter les réponses
    if (!skip && answers) {
      if (answers.level) updateData.level = answers.level;
      if (answers.preferred_side) updateData.preferred_side = answers.preferred_side;
      if (answers.hand) updateData.hand = answers.hand;
      if (answers.frequency) updateData.frequency = answers.frequency;
      if (answers.best_shot) updateData.best_shot = answers.best_shot;
    }

    // Mettre à jour le profil
    const { error: updateError } = await serviceClient
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (updateError) {
      logger.error(
        { userId: user.id.substring(0, 8) + "…", error: updateError },
        "[onboarding/complete] Erreur lors de la mise à jour du profil"
      );
      return NextResponse.json(
        { error: "Erreur lors de la sauvegarde" },
        { status: 500 }
      );
    }

    logger.info(
      { userId: user.id.substring(0, 8) + "…", skip },
      "[onboarding/complete] Onboarding complété avec succès"
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    logger.error(
      { error: error?.message || String(error) },
      "[onboarding/complete] Erreur inattendue"
    );
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
