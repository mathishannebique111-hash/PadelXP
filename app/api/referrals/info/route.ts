import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserReferralInfo } from "@/lib/utils/referral-utils";
import { logger } from "@/lib/logger";

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

    const referralInfo = await getUserReferralInfo(user.id);

    return NextResponse.json(referralInfo);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined, userId: user?.id?.substring(0, 8) + "…" }, "[GET /api/referrals/info] Error:");
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

