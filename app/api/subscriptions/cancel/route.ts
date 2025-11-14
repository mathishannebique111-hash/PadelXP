import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubSubscription, cancelSubscription } from "@/lib/utils/subscription-utils";
import { getUserClubInfo } from "@/lib/utils/club-utils";

/**
 * Annule l'abonnement d'un club
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
    const { cancelAtPeriodEnd = true } = body as { cancelAtPeriodEnd?: boolean };

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

