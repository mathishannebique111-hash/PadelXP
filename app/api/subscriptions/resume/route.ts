import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubSubscription, resumeSubscription } from "@/lib/utils/subscription-utils";
import { getUserClubInfo } from "@/lib/utils/club-utils";

/**
 * Reprend l'abonnement d'un club (depuis paused)
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

    const subscription = await getClubSubscription(clubId);
    if (!subscription) {
      return NextResponse.json(
        { error: "Abonnement introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que l'abonnement peut être repris
    if (subscription.status !== "paused") {
      return NextResponse.json(
        { error: "L'abonnement ne peut pas être repris dans cet état" },
        { status: 400 }
      );
    }

    // Vérifier si un moyen de paiement est présent
    if (!subscription.has_payment_method) {
      return NextResponse.json(
        {
          error: "Aucun moyen de paiement enregistré",
          requiresPaymentMethod: true,
        },
        { status: 400 }
      );
    }

    const success = await resumeSubscription(subscription.id, user.id);

    if (!success) {
      return NextResponse.json(
        { error: "Erreur lors de la reprise" },
        { status: 500 }
      );
    }

    const updatedSubscription = await getClubSubscription(clubId);

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      message: "Abonnement repris avec succès",
    });
  } catch (error: any) {
    console.error("[resume subscription] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

