import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubSubscription, initializeSubscription } from "@/lib/utils/subscription-utils";
import { getUserClubInfo } from "@/lib/utils/club-utils";
import { z } from "zod";
import { logger } from "@/lib/logger";

/**
 * Zod : valider clubId (doit être une string UUID ou au moins string non vide)
 */
const ClubIdSchema = z.object({
  clubId: z.string().min(1),
});

/**
 * Récupère l'abonnement actuel d'un club ou en initialise un s'il n'existe pas
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.warn("[subscriptions/current] Accès refusé : non authentifié");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const clubInfo = await getUserClubInfo();
    const checkClub = ClubIdSchema.safeParse(clubInfo);
    if (!checkClub.success) {
      logger.warn(
        "[subscriptions/current] clubId invalide ou manquant",
        clubInfo
      );
      return NextResponse.json({ error: "Club introuvable" }, { status: 404 });
    }
    const { clubId } = checkClub.data;

    // Log entrée
    const userIdPreview = user.id.substring(0, 8) + "…";
    logger.info("[subscriptions/current] user:", userIdPreview, "club:", clubId);
    
    // Check droits métier (selon logique, ajoute ici si admin/membre seulement !)

    // Récupérer ou initialiser l'abonnement
    let subscription = await getClubSubscription(clubId);

    if (!subscription) {
      logger.info(
        "[subscriptions/current] Abonnement absent, init essai clubId:",
        clubId
      );
      subscription = await initializeSubscription(clubId);
    }

    if (!subscription) {
      logger.error("[subscriptions/current] Erreur init clubId:", clubId);
      return NextResponse.json(
        { error: "Erreur lors de l'initialisation de l'abonnement" },
        { status: 500 }
      );
    }

    return NextResponse.json({ subscription });
  } catch (error: any) {
    logger.error("[subscriptions/current] Erreur:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
