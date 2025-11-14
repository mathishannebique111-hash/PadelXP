import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getClubSubscription,
  activateSubscription,
  scheduleActivation,
  PlanCycle,
} from "@/lib/utils/subscription-utils";
import { getUserClubInfo } from "@/lib/utils/club-utils";

/**
 * Active l'abonnement d'un club (immédiatement ou à la fin de l'essai)
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
    const { planCycle, activateNow = false } = body as {
      planCycle: PlanCycle;
      activateNow?: boolean;
    };

    if (!planCycle || !["monthly", "quarterly", "annual"].includes(planCycle)) {
      return NextResponse.json(
        { error: "Cycle de plan invalide" },
        { status: 400 }
      );
    }

    // Récupérer l'abonnement
    let subscription = await getClubSubscription(clubId);
    if (!subscription) {
      return NextResponse.json(
        { error: "Abonnement introuvable" },
        { status: 404 }
      );
    }

    // Vérifier si l'utilisateur a un moyen de paiement
    if (!subscription.has_payment_method) {
      return NextResponse.json(
        {
          error: "Aucun moyen de paiement enregistré",
          requiresPaymentMethod: true,
        },
        { status: 400 }
      );
    }

    // Activer maintenant ou programmer l'activation
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

    // Récupérer l'abonnement mis à jour
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

