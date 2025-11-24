import { NextResponse } from "next/server";
import { validateReferralCode } from "@/lib/utils/referral-utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code } = body as { code?: string };

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "Code de parrainage requis" },
        { status: 400 }
      );
    }

    // Valider le code de parrainage
    // Note: On ne vérifie pas l'auto-parrainage ici car l'utilisateur peut ne pas être connecté
    // lors de l'inscription. L'auto-parrainage sera vérifié lors du traitement dans processReferralCode
    const validation = await validateReferralCode(code);

    // Si l'utilisateur est connecté, on peut vérifier l'auto-parrainage pour un feedback immédiat
    // Mais on ne bloque pas la validation si l'utilisateur n'est pas connecté (cas normal lors de l'inscription)
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user && validation.valid && validation.referrerId) {
        const { isSelfReferral } = await import("@/lib/utils/referral-utils");
        const isSelf = await isSelfReferral(user.id, code);
        if (isSelf) {
          return NextResponse.json({
            valid: false,
            error: "Vous ne pouvez pas utiliser votre propre code de parrainage",
          });
        }
      }
    } catch (authError) {
      // Si l'utilisateur n'est pas connecté (normal lors de l'inscription), on continue
      // L'auto-parrainage sera vérifié plus tard dans processReferralCode
    }

    return NextResponse.json(validation);
  } catch (error) {
    console.error("[POST /api/referrals/validate] Error:", error);
    return NextResponse.json(
      { valid: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

