import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Cron job: vérifier les abonnements premium expirés et les désactiver.
 * Tourne quotidiennement. Vérifie premium_until < maintenant.
 */
export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.SUBSCRIPTION_CRON_SECRET || process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const now = new Date().toISOString();

    // Find all users where is_premium = true AND premium_until < now
    const { data: expiredUsers, error } = await admin
      .from("profiles")
      .select("id, display_name, premium_until, payment_method")
      .eq("is_premium", true)
      .not("premium_until", "is", null)
      .lt("premium_until", now);

    if (error) {
      logger.error("[cron/premium-expiration] Query error", { error: error.message });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      logger.info("[cron/premium-expiration] No expired premiums found");
      return NextResponse.json({ expired: 0 });
    }

    logger.info(`[cron/premium-expiration] Found ${expiredUsers.length} expired premium users`);

    let deactivated = 0;

    for (const user of expiredUsers) {
      // Don't deactivate Stripe users — Stripe webhooks handle this
      // Only deactivate Apple/Android/referral users via premium_until
      if (user.payment_method === "stripe") {
        logger.info(`[cron/premium-expiration] Skipping Stripe user ${user.id} (webhook handles this)`);
        continue;
      }

      const { error: updateError } = await admin
        .from("profiles")
        .update({ is_premium: false })
        .eq("id", user.id);

      if (updateError) {
        logger.error(`[cron/premium-expiration] Failed to deactivate ${user.id}`, { error: updateError.message });
      } else {
        deactivated++;
        logger.info(`[cron/premium-expiration] Deactivated premium for ${user.id} (${user.display_name}), was until ${user.premium_until}`);
      }
    }

    return NextResponse.json({ expired: expiredUsers.length, deactivated });
  } catch (err) {
    logger.error("[cron/premium-expiration] Unexpected error", { error: (err as Error).message });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
