import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPendingReferralNotifications, hasUserUsedReferralCode } from "@/lib/utils/referral-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { hasNotification: false },
        { status: 200 }
      );
    }

    // Vérifier les notifications pour le parrain (nouveau filleul)
    const referrerNotification = await getPendingReferralNotifications(user.id);

    // Vérifier si l'utilisateur a utilisé un code de parrainage (notification pour le filleul)
    // Cette notification ne doit s'afficher qu'une seule fois, donc on vérifie localStorage côté client
    // On ne retourne pas cette notification ici car elle est gérée via sessionStorage dans ReferralNotifier

    // Prioriser la notification de parrain (plus récente)
    if (referrerNotification.hasNewReferral) {
      return NextResponse.json({
        hasNotification: true,
        type: "referrer",
        referredName: referrerNotification.referredName,
        date: referrerNotification.referralDate,
      });
    }

    if (referredNotification) {
      return NextResponse.json({
        hasNotification: true,
        ...referredNotification,
      });
    }

    return NextResponse.json({ hasNotification: false });
  } catch (error) {
    console.error("[GET /api/referrals/notifications] Error:", error);
    return NextResponse.json(
      { hasNotification: false },
      { status: 200 }
    );
  }
}

