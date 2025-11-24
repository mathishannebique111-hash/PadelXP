import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { creditUserFreeBoost, isReviewsGoalReached, hasUserReviewedBeforeGoal, hasUserClaimedFreeBoost } from "@/lib/utils/reviews-reward-utils";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    // Vérifier que l'objectif est atteint
    const goalReached = await isReviewsGoalReached();
    if (!goalReached) {
      return NextResponse.json(
        { error: "L'objectif de 50 avis n'est pas encore atteint" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur est éligible
    const isEligible = await hasUserReviewedBeforeGoal(user.id);
    if (!isEligible) {
      return NextResponse.json(
        { error: "Vous n'êtes pas éligible pour cette récompense. Vous devez avoir laissé un avis avant l'atteinte de l'objectif." },
        { status: 403 }
      );
    }

    // Vérifier que l'utilisateur n'a pas déjà réclamé
    const alreadyClaimed = await hasUserClaimedFreeBoost(user.id);
    if (alreadyClaimed) {
      return NextResponse.json(
        { error: "Vous avez déjà réclamé cette récompense" },
        { status: 400 }
      );
    }

    // Créditer le boost gratuit
    const result = await creditUserFreeBoost(user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erreur lors de l'attribution du boost" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Boost gratuit attribué avec succès !",
    });
  } catch (error) {
    console.error("[POST /api/reviews/claim-free-boost] Error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

