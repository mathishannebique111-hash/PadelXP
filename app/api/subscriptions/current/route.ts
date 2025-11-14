import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClubSubscription, initializeSubscription } from "@/lib/utils/subscription-utils";
import { getUserClubInfo } from "@/lib/utils/club-utils";

/**
 * Récupère l'abonnement actuel d'un club ou en initialise un s'il n'existe pas
 */
export async function GET() {
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

    // Récupérer ou initialiser l'abonnement
    let subscription = await getClubSubscription(clubId);
    
    if (!subscription) {
      // Initialiser un nouvel abonnement (essai gratuit)
      subscription = await initializeSubscription(clubId);
    }

    if (!subscription) {
      return NextResponse.json(
        { error: "Erreur lors de l'initialisation de l'abonnement" },
        { status: 500 }
      );
    }

    return NextResponse.json({ subscription });
  } catch (error: any) {
    console.error("[get current subscription] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

