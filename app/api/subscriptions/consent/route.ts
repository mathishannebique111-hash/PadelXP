import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubSubscription, setAutoActivateConsent } from "@/lib/utils/subscription-utils";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { z } from "zod";

/**
 * Met à jour le consentement d'activation automatique à la fin de l'essai
 */

// ✅ Schéma Zod strict
const consentSchema = z.object({
  consent: z.boolean(),
});

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

    // ✅ Validation et parsing du body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Format de requête invalide" }, { status: 400 });
    }
    const parsed = consentSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0] ?? "Données invalides";
      return NextResponse.json({ error: firstError, details: fieldErrors }, { status: 400 });
    }
    const { consent } = parsed.data;

    const subscription = await getClubSubscription(clubId);
    if (!subscription) {
      return NextResponse.json(
        { error: "Abonnement introuvable" },
        { status: 404 }
      );
    }

    // Si consentement=true, vérifier qu'un moyen de paiement est présent
    if (consent && !subscription.has_payment_method) {
      return NextResponse.json(
        {
          error: "Un moyen de paiement est requis pour activer l'abonnement automatiquement",
          requiresPaymentMethod: true,
        },
        { status: 400 }
      );
    }

    const success = await setAutoActivateConsent(subscription.id, consent);

    if (!success) {
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du consentement" },
        { status: 500 }
      );
    }

    const updatedSubscription = await getClubSubscription(clubId);

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      message: consent
        ? "Activation automatique activée à la fin de l'essai"
        : "Activation automatique désactivée",
    });
  } catch (error: any) {
    console.error("[update consent] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
