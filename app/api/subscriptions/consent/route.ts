import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubSubscription, setAutoActivateConsent } from "@/lib/utils/subscription-utils";
import { getUserClubInfo } from "@/lib/utils/club-utils";

/**
 * Met à jour le consentement d'activation automatique à la fin de l'essai
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient();
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

    const body = await req.json();
    const { consent } = body as { consent: boolean };

    if (typeof consent !== "boolean") {
      return NextResponse.json(
        { error: "Le consentement doit être un booléen" },
        { status: 400 }
      );
    }

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

