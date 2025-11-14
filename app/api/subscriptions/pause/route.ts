import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubSubscription, pauseSubscription } from "@/lib/utils/subscription-utils";
import { getUserClubInfo } from "@/lib/utils/club-utils";

/**
 * Met en pause l'abonnement d'un club
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

    // Vérifier que l'abonnement peut être mis en pause
    if (subscription.status !== "active") {
      return NextResponse.json(
        { error: "L'abonnement ne peut pas être mis en pause dans cet état" },
        { status: 400 }
      );
    }

    const success = await pauseSubscription(subscription.id, user.id);

    if (!success) {
      return NextResponse.json(
        { error: "Erreur lors de la mise en pause" },
        { status: 500 }
      );
    }

    const updatedSubscription = await getClubSubscription(clubId);

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      message: "Abonnement mis en pause",
    });
  } catch (error: any) {
    console.error("[pause subscription] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

