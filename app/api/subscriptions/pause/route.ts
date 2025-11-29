import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubSubscription, pauseSubscription } from "@/lib/utils/subscription-utils";
import { getUserClubInfo } from "@/lib/utils/club-utils";

/**
 * Met en pause l'abonnement d'un club
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("[pause subscription] Refus : non authentifié");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userIdPreview = user.id.substring(0, 8) + "…";

    const { clubId } = await getUserClubInfo();
    if (!clubId) {
      console.warn("[pause subscription] Refus : club introuvable pour user", userIdPreview);
      return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
    }

    const subscription = await getClubSubscription(clubId);
    if (!subscription) {
      console.warn("[pause subscription] Refus : abonnement introuvable", clubId);
      return NextResponse.json(
        { error: "Abonnement introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que l'abonnement peut être mis en pause
    if (subscription.status !== "active") {
      console.warn("[pause subscription] Refus : état non actif", subscription.id, subscription.status);
      return NextResponse.json(
        { error: "L'abonnement ne peut pas être mis en pause dans cet état" },
        { status: 400 }
      );
    }

    // LOG avant l'action
    console.log("[pause subscription] Tentative user", userIdPreview, "club", clubId, "subs", subscription.id);

    const success = await pauseSubscription(subscription.id, user.id);

    if (!success) {
      console.error("[pause subscription] Échec mise en pause", subscription.id, userIdPreview);
      return NextResponse.json(
        { error: "Erreur lors de la mise en pause" },
        { status: 500 }
      );
    }

    const updatedSubscription = await getClubSubscription(clubId);

    // LOG après l'action
    console.log("[pause subscription] Succès user", userIdPreview, "club", clubId, "subs", subscription.id);

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      message: "Abonnement mis en pause",
    });
  } catch (error: any) {
    console.error("[pause subscription] Erreur serveur:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
