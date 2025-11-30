import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubSubscription, resumeSubscription } from "@/lib/utils/subscription-utils";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { logger } from "@/lib/logger";

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
      logger.warn("[resume subscription] Refus : non authentifié");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userIdPreview = user.id.substring(0, 8) + "…";

    const { clubId } = await getUserClubInfo();
    if (!clubId) {
      logger.warn(
        { userId: userIdPreview },
        "[resume subscription] Refus : club introuvable pour user"
      );
      return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
    }

    const subscription = await getClubSubscription(clubId);
    if (!subscription) {
      logger.warn(
        { clubId },
        "[resume subscription] Refus : abonnement introuvable"
      );
      return NextResponse.json(
        { error: "Abonnement introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que l'abonnement peut être repris
    if (subscription.status !== "paused") {
      logger.warn(
        { subscriptionId: subscription.id, status: subscription.status },
        "[resume subscription] Refus : état non paused"
      );
      return NextResponse.json(
        { error: "L'abonnement ne peut pas être repris dans cet état" },
        { status: 400 }
      );
    }

    // Vérifier si un moyen de paiement est présent
    if (!subscription.has_payment_method) {
      logger.warn(
        { subscriptionId: subscription.id, userId: userIdPreview },
        "[resume subscription] Refus : pas de moyen de paiement enregistré"
      );
      return NextResponse.json(
        {
          error: "Aucun moyen de paiement enregistré",
          requiresPaymentMethod: true,
        },
        { status: 400 }
      );
    }

    logger.info(
      {
        subscriptionId: subscription.id,
        userId: userIdPreview,
        clubId,
      },
      "[resume subscription] Tentative de reprise"
    );

    const success = await resumeSubscription(subscription.id, user.id);

    if (!success) {
      logger.error(
        { subscriptionId: subscription.id, userId: userIdPreview },
        "[resume subscription] Échec de la reprise"
      );
      return NextResponse.json(
        { error: "Erreur lors de la reprise" },
        { status: 500 }
      );
    }

    const updatedSubscription = await getClubSubscription(clubId);

    logger.info(
      {
        subscriptionId: subscription.id,
        userId: userIdPreview,
        clubId,
      },
      "[resume subscription] Succès de la reprise"
    );

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
      message: "Abonnement repris avec succès",
    });
  } catch (error: any) {
    logger.error({ err: error }, "[resume subscription] Erreur serveur");
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}