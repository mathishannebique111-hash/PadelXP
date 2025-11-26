import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubSubscription, resumeSubscription } from "@/lib/utils/subscription-utils";
import { getUserClubInfo } from "@/lib/utils/club-utils";

/**
 * Reprend l'abonnement d'un club (depuis paused)
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("[resume subscription] Refus : non authentifié");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { clubId } = await getUserClubInfo();
    if (!clubId) {
      console.warn("[resume subscription] Refus : club introuvable pour user", user.id);
      return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
    }

    const subscription = await getClubSubscription(clubId);
    if (!subscription) {
      console.warn("[resume subscription] Refus : abonnement introuvable", clubId);
      return NextResponse.json(
        { error: "Abonnement introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que l'abonnement peut être repris
    if (subscription.status !== "paused") {
      console.warn("[resume subscription] Refus : état non paused", subscription.id, subscription.status);
      return NextResponse.json(
        { error: "L'abonnement ne peut pas être repris dans cet état" },
        { status: 400 }
      );
    }

    // Vérifier si un moyen de paiement est présent
    if (!subscription.has_payment_method) {
      console.warn("[resume subscription] Refus : pas de moyen de paiement enregistré", subscription.id, user.id);
      return NextResponse.json(
        {
          error: "Aucun moyen de paiement enregistré",
          requiresPaymentMethod: true,
        },
        { status: 400 }
      );
    }

    console.log("[resume subscription] Tentative de reprise sub", subscription.id, "par user", user.id, "club", clubId);

    const success = await resumeSubscription(subscription.id, user.id);

    if (!success) {
      console.error("[resume subscription] Échec de la reprise", subscription.id, user.id);
      return NextResponse.json(
        { error: "Erreur lors de la reprise" },
        { status: 500 }
      );
    }

    const updatedSubscription = await getClubSubscription(clubId);

    console.log("[resume subscription] Succès de la reprise sub", subscription.id, "par user", user.id, "club", clubId);

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      message: "Abonnement repris avec succès",
    });
  } catch (error: any) {
    console.error("[resume subscription] Erreur serveur:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
