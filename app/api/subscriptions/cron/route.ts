console.log("[CRON] - ENV secret actuel :", process.env.SUBSCRIPTION_CRON_SECRET);
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  handleTrialEnd,
  shouldSendTrialReminder,
  getClubSubscriptionById,
} from "@/lib/utils/subscription-utils";
import { z } from "zod";

/**
 * Validation Zod du paramètre secret en query
 */
const querySchema = z.object({
  secret: z.string().nonempty(),
});

/**
 * Cron job pour gérer les transitions automatiques d'abonnements
 */
export async function GET(req: Request) {
  try {
    // Extraction et validation du paramètre secret
    const url = new URL(req.url);
    const validation = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!validation.success) {
      console.error("[cron] Validation query failed:", validation.error.format());
      return NextResponse.json({ error: "Paramètre secret invalide" }, { status: 400 });
    }

    const { secret } = validation.data;
    const expectedSecret = process.env.SUBSCRIPTION_CRON_SECRET;

    // DEBUG LOG pour voir ce qui est chargé
    console.log(
      "[CRON] Secret attendu:", expectedSecret,
      "| Secret reçu:", secret
    );

    if (!expectedSecret || secret !== expectedSecret) {
      console.warn("[cron] Unauthorized access attempt");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const results = {
      trialEndsProcessed: 0,
      remindersSent: 0,
      errors: [] as string[],
    };

    // ... (le reste du traitement ne change pas)
    // 1. Fin d'essai, rappels, périodes de grâce comme avant

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error: any) {
    console.error("[cron] Error:", error);
    return NextResponse.json({ error: error?.message || "Erreur serveur" }, { status: 500 });
  }
}
