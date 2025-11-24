import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserReferralInfo } from "@/lib/utils/referral-utils";

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
    console.error("[GET /api/referrals/info] Error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

