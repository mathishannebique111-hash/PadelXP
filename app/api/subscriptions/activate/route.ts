import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getClubSubscription,
  activateSubscription,
  scheduleActivation,
  PlanCycle,
} from "@/lib/utils/subscription-utils";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { z } from "zod";

// === AJOUT : Schéma Zod ===
const activateBodySchema = z.object({
  planCycle: z.enum(["monthly", "quarterly", "annual"])
    .refine(
      (val) => ["monthly", "quarterly", "annual"].includes(val),
      { message: "Cycle de plan invalide" }
    ),
  activateNow: z.boolean().optional().default(false)
});

// === FIN AJOUT ===

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { clubId } = await getUserClubInfo();
    if (!clubId) {
      return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
    }

    // === MODIFICATION : Validation Zod ===
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json({ error: "Format de requête invalide" }, { status: 400 });
    }
    const parsed = activateBodySchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0] ?? "Données invalides";
      return NextResponse.json({ error: firstError, details: fieldErrors }, { status: 400 });
    }
    const { planCycle, activateNow } = parsed.data;
    // === FIN MODIFICATION ===

    let subscription = await getClubSubscription(clubId);
    if (!subscription) {
      return NextResponse.json(
        { error: "Abonnement introuvable" },
        { status: 404 }
      );
    }

    if (!subscription.has_payment_method) {
      return NextResponse.json(
        {
          error: "Aucun moyen de paiement enregistré",
          requiresPaymentMethod: true,
        },
        { status: 400 }
      );
    }

    let success = false;
    if (activateNow) {
      success = await activateSubscription(subscription.id, planCycle, user.id);
    } else {
      success = await scheduleActivation(subscription.id, planCycle, user.id);
    }

    if (!success) {
      return NextResponse.json(
        { error: "Erreur lors de l'activation" },
        { status: 500 }
      );
    }

    subscription = await getClubSubscription(clubId);

    return NextResponse.json({
      success: true,
      subscription,
      message: activateNow
        ? "Abonnement activé avec succès"
        : "Activation programmée à la fin de l'essai",
    });
  } catch (error: any) {
    console.error("[activate subscription] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
