import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubSubscription, cancelSubscription } from "@/lib/utils/subscription-utils";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { z } from "zod";

// === AJOUT : Schéma Zod ===
const cancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().default(true),
});
// === FIN AJOUT ===

/**
 * Annule l'abonnement d'un club
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    const parsed = cancelSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0] ?? "Données invalides";
      return NextResponse.json({ error: firstError, details: fieldErrors }, { status: 400 });
    }

    const { cancelAtPeriodEnd } = parsed.data;
    // === FIN MODIFICATION ===

    const subscription = await getClubSubscription(clubId);
    if (!subscription) {
      return NextResponse.json(
        { error: "Abonnement introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que l'abonnement peut être annulé
    if (subscription.status === "canceled") {
      return NextResponse.json(
        { error: "L'abonnement est déjà annulé" },
        { status: 400 }
      );
    }

    const success = await cancelSubscription(
      subscription.id,
      cancelAtPeriodEnd,
      user.id
    );

    if (!success) {
      return NextResponse.json(
        { error: "Erreur lors de l'annulation" },
        { status: 500 }
      );
    }

    const updatedSubscription = await getClubSubscription(clubId);

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      message: cancelAtPeriodEnd
        ? "Annulation programmée à la fin de la période"
        : "Abonnement annulé immédiatement",
    });
  } catch (error: any) {
    console.error("[cancel subscription] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
