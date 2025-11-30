import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubSubscription, pauseSubscription } from "@/lib/utils/subscription-utils";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { logger } from "@/lib/logger";

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
      logger.warn("[pause subscription] Refus : non authentifié");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userIdPreview = user.id.substring(0, 8) + "…";

    const { clubId } = await getUserClubInfo();
    if (!clubId) {
      logger.warn(
        { userId: userIdPreview },
        "[pause subscription] Refus : club introuvable pour user"
      );
      return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
    }

    const subscription = await getClubSubscription(clubId);
    if (!subscription) {
      logger.warn(
        { clubId },
        "[pause subscription] Refus : abonnement introuvable"
      );
      return NextResponse.json(
        { error: "Abonnement introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que l'abonnement peut être mis en pause
    if (subscription.status !== "active") {
      logger.warn(
        { subscriptionId: subscription.id, status: subscription.status },
        "[pause subscription] Refus : état non actif"
      );
      return NextResponse.json(
        { error: "L'abonnement ne peut pas être mis en pause dans cet état" },
        { status: 400 }
      );
    }

    // LOG avant l'action
    logger.info(
      {
        userId: userIdPreview,
        clubId,
        subscriptionId: subscription.id,
      },
      "[pause subscription] Tentative de mise en pause"
    );

    const success = await pauseSubscription(subscription.id, user.id);

    if (!success) {
      logger.error(
        { subscriptionId: subscription.id, userId: userIdPreview },
        "[pause subscription] Échec mise en pause"
      );
      return NextResponse.json(
        { error: "Erreur lors de la mise en pause" },
        { status: 500 }
      );
    }

    const updatedSubscription = await getClubSubscription(clubId);

    // LOG après l'action
    logger.info(
      {
        userId: userIdPreview,
        clubId,
        subscriptionId: subscription.id,
      },
      "[pause subscription] Succès"
    );

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      message: "Abonnement mis en pause",
    });
  } catch (error: any) {
    logger.error({ err: error }, "[pause subscription] Erreur serveur");
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
