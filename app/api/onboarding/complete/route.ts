import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { getDepartmentFromPostalCode, getRegionFromDepartment } from "@/lib/utils/geo-leaderboard-utils";
import { revalidatePath } from "next/cache";

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
    const { answers, skip, postal_code, city } = body;

    const serviceClient = createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Préparer les données à mettre à jour
    const updateData: any = {
      has_completed_onboarding: true,
      email: user.email, // Sync email to profile
    };

    // Si ce n'est pas un skip, ajouter les réponses
    if (!skip && answers) {
      if (answers.level) updateData.level = answers.level;
      if (answers.preferred_side) updateData.preferred_side = answers.preferred_side;
      if (answers.hand) updateData.hand = answers.hand;
      if (answers.frequency) updateData.frequency = answers.frequency;
      if (answers.best_shot) updateData.best_shot = answers.best_shot;
    }

    // Gestion des noms (si fournis lors de l'onboarding)
    if (body.first_name) updateData.first_name = body.first_name;
    if (body.last_name) updateData.last_name = body.last_name;
    if (body.first_name || body.last_name) {
      // Si on met à jour l'un des deux, on recalcule le full_name
      // On récupère d'abord les valeurs actuelles si l'une manque
      let firstName = body.first_name;
      let lastName = body.last_name;

      if (!firstName || !lastName) {
        const { data: currentProfile } = await serviceClient
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        if (currentProfile) {
          firstName = firstName || currentProfile.first_name || "";
          lastName = lastName || currentProfile.last_name || "";
        }
      }

      updateData.full_name = `${firstName} ${lastName}`.trim();
      updateData.display_name = updateData.full_name;
    }

    // Geo fields from postal code
    if (postal_code) {
      updateData.postal_code = postal_code;
      if (city) updateData.city = city;
      const dept = getDepartmentFromPostalCode(postal_code);
      if (dept) {
        updateData.department_code = dept;
        const region = getRegionFromDepartment(dept);
        if (region) updateData.region_code = region;
      }
    }

    // Mettre à jour le profil
    const { error: updateError } = await serviceClient
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (updateError) {
      logger.error(
        "[onboarding/complete] Erreur lors de la mise à jour du profil",
        { userId: user.id.substring(0, 8) + "…", error: updateError }
      );
      return NextResponse.json(
        { error: "Erreur lors de la sauvegarde" },
        { status: 500 }
      );
    }

    logger.info(
      "[onboarding/complete] Onboarding complété avec succès",
      { userId: user.id.substring(0, 8) + "…", skip }
    );

    // Invalider le cache pour forcer la redirection et éviter le double onboarding
    revalidatePath("/home");
    revalidatePath("/player/onboarding");
    revalidatePath("/(protected)/home", "page");

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    logger.error(
      "[onboarding/complete] Erreur inattendue",
      { error: error?.message || String(error) }
    );
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
