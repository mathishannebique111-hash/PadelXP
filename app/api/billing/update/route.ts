import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createServiceClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { clubId } = await getUserClubInfo();
    if (!clubId) {
      return NextResponse.json({ error: "Aucun club associé" }, { status: 400 });
    }

    const body = await req.json();
    const { billingEmail, billingAddress, vatNumber } = body;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
    }

    // Récupérer l'abonnement actuel
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("club_id", clubId)
      .maybeSingle();

    if (subError && subError.code !== 'PGRST116') {
      logger.error({ error: subError, userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" }, "[update-billing] Error fetching subscription:");
      return NextResponse.json({ error: "Erreur lors de la récupération de l'abonnement" }, { status: 500 });
    }

    // Préparer les données à mettre à jour
    const updateData: any = {};
    if (billingEmail !== undefined) updateData.billing_email = billingEmail || null;
    if (billingAddress !== undefined) updateData.billing_address = billingAddress || null;
    if (vatNumber !== undefined) updateData.vat_number = vatNumber || null;

    let updateResult;
    if (subscription) {
      // Mettre à jour l'abonnement existant
      updateResult = await supabaseAdmin
        .from("subscriptions")
        .update(updateData)
        .eq("id", subscription.id);
    } else {
      // Créer un enregistrement si aucun abonnement n'existe
      updateResult = await supabaseAdmin
        .from("subscriptions")
        .insert({
          club_id: clubId,
          status: "trialing",
          ...updateData,
        });
    }

    if (updateResult.error) {
      logger.error({ error: updateResult.error, userId: user.id.substring(0, 8) + "…", clubId: clubId.substring(0, 8) + "…" }, "[update-billing] Error updating billing info:");
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour des informations de facturation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ error: error?.message || String(error), stack: error?.stack, userId: user?.id?.substring(0, 8) + "…" }, "[update-billing] Unexpected error:");
    return NextResponse.json(
      { error: error.message || "Erreur inattendue" },
      { status: 500 }
    );
  }
}


