import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { 
  isReviewsGoalReached, 
  hasUserReviewedBeforeGoal, 
  hasUserClaimedFreeBoost,
  getTotalReviewsCount 
} from "@/lib/utils/reviews-reward-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const [goalReached, totalReviews, isEligible, hasClaimed] = await Promise.all([
      isReviewsGoalReached(),
      getTotalReviewsCount(),
      hasUserReviewedBeforeGoal(user.id),
      hasUserClaimedFreeBoost(user.id),
    ]);

    return NextResponse.json({
      goalReached,
      totalReviews,
      isEligible,
      hasClaimed,
      canClaim: goalReached && isEligible && !hasClaimed,
    });
  } catch (error) {
    console.error("[GET /api/reviews/reward-status] Error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

