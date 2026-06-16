import { NextResponse } from "next/server";
import { validateReferralCode } from "@/lib/utils/referral-utils";
import { z } from "zod";
import { logger } from "@/lib/logger";
const ReferralValidateSchema = z.object({
  code: z.string().trim().min(1, "Code requis").max(50, "Code trop long"),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
        // 1) Lecture du JSON brut
        let body;
        try {
          body = await req.json();
        } catch {
          return NextResponse.json(
            { valid: false, error: "JSON invalide" },
            { status: 400 }
          );
        }
    
        // 2) Validation avec Zod
        const parsed = ReferralValidateSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            {
              valid: false,
              error: "Validation échouée",
              details: parsed.error.flatten().fieldErrors,
            },
            { status: 400 }
          );
        }
    
        const { code } = parsed.data;

    // Valider le code promo (seul "CLUB" est accepté → 1 mois de Premium offert)
    const validation = await validateReferralCode(code);

    return NextResponse.json(validation);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "[POST /api/referrals/validate] Error");
    return NextResponse.json(
      { valid: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

