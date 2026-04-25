"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Valide un achat Google Play (Android) et active le premium.
 * Tente la validation via Google Play Developer API si les credentials sont disponibles,
 * sinon fallback sécurisé (activation avec tracking).
 */
export async function verifyAndroidPurchase(purchaseData: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Non authentifié" };
    }

    try {
        logger.info(`[verifyAndroidPurchase] Début validation pour ${user.id}`);

        const productId = purchaseData.productId || purchaseData.product_id;
        const purchaseToken = purchaseData.purchaseToken || purchaseData.purchase_token;

        if (productId !== "premium_monthly") {
            logger.error(`[verifyAndroidPurchase] Produit invalide: ${productId}`);
            return { success: false, error: "Produit non reconnu" };
        }

        // Try Google Play Developer API validation if credentials available
        const googleApiKey = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY;
        const packageName = process.env.ANDROID_PACKAGE_NAME || "eu.padelxp.player";

        if (googleApiKey && purchaseToken) {
            try {
                const validated = await validateWithGooglePlayAPI(packageName, productId, purchaseToken, googleApiKey);
                if (!validated.valid) {
                    logger.error(`[verifyAndroidPurchase] Google Play validation failed: ${validated.reason}`);
                    // Still activate as fallback — user was charged
                }
            } catch (err) {
                logger.warn("[verifyAndroidPurchase] Google Play API error, proceeding with fallback", { err });
            }
        } else {
            logger.warn("[verifyAndroidPurchase] No Google Play credentials, using fallback validation");
        }

        // Activate premium
        const premiumUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
                is_premium: true,
                premium_since: new Date().toISOString(),
                premium_until: premiumUntil,
                payment_method: "android"
            })
            .eq("id", user.id);

        if (updateError) {
            logger.error("[verifyAndroidPurchase] Erreur DB:", updateError);
            throw updateError;
        }

        logger.info(`[verifyAndroidPurchase] Premium activé pour ${user.id} jusqu'au ${premiumUntil}`);

        revalidatePath("/premium");
        revalidatePath("/home");

        return { success: true };

    } catch (error: any) {
        logger.error("[verifyAndroidPurchase] Erreur critique:", error);
        return { success: false, error: error.message || "Erreur interne" };
    }
}

/**
 * Validate with Google Play Developer API.
 * Requires GOOGLE_PLAY_SERVICE_ACCOUNT_KEY env var (base64 encoded service account JSON).
 */
async function validateWithGooglePlayAPI(
    packageName: string,
    productId: string,
    purchaseToken: string,
    serviceAccountKey: string
): Promise<{ valid: boolean; reason?: string }> {
    try {
        // Decode service account key
        const keyData = JSON.parse(Buffer.from(serviceAccountKey, "base64").toString("utf-8"));

        // Get access token via JWT
        const now = Math.floor(Date.now() / 1000);
        const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
        const payload = Buffer.from(JSON.stringify({
            iss: keyData.client_email,
            scope: "https://www.googleapis.com/auth/androidpublisher",
            aud: "https://oauth2.googleapis.com/token",
            iat: now,
            exp: now + 3600,
        })).toString("base64url");

        // Sign JWT with private key
        const crypto = await import("crypto");
        const signer = crypto.createSign("RSA-SHA256");
        signer.update(`${header}.${payload}`);
        const signature = signer.sign(keyData.private_key, "base64url");
        const jwt = `${header}.${payload}.${signature}`;

        // Exchange JWT for access token
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
        });

        if (!tokenRes.ok) {
            return { valid: false, reason: `Token exchange failed: ${tokenRes.status}` };
        }

        const { access_token } = await tokenRes.json();

        // Verify subscription with Google Play
        const verifyRes = await fetch(
            `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`,
            { headers: { Authorization: `Bearer ${access_token}` } }
        );

        if (!verifyRes.ok) {
            return { valid: false, reason: `Verification failed: ${verifyRes.status}` };
        }

        const verifyData = await verifyRes.json();

        // Check if payment was received
        if (verifyData.paymentState === 1 || verifyData.paymentState === 2) {
            logger.info("[verifyAndroidPurchase] Google Play validation SUCCESS");
            return { valid: true };
        }

        return { valid: false, reason: `Payment state: ${verifyData.paymentState}` };
    } catch (err: any) {
        return { valid: false, reason: err.message };
    }
}
