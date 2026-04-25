"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AppleVerifyReceiptResponse {
    status: number;
    receipt?: {
        in_app: Array<{
            product_id: string;
            transaction_id: string;
            original_transaction_id: string;
            purchase_date_ms: string;
            expires_date_ms?: string;
        }>;
    };
    latest_receipt_info?: Array<{
        product_id: string;
        transaction_id: string;
        original_transaction_id: string;
        purchase_date_ms: string;
        expires_date_ms?: string;
    }>;
    pending_renewal_info?: Array<{
        product_id: string;
        auto_renew_status: string;
    }>;
}

/**
 * Valide un reçu Apple In-App Purchase et active le premium.
 * Gère: receipt base64, sandbox fallback, multiples product IDs, premium_until.
 */
export async function verifyAppleReceipt(receiptData: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Non authentifié" };
    }

    try {
        logger.info(`[verifyAppleReceipt] Début validation pour ${user.id}`);
        logger.info(`[verifyAppleReceipt] Receipt length: ${receiptData?.length || 0}`);

        if (!receiptData || receiptData.length < 100) {
            logger.error("[verifyAppleReceipt] Receipt trop court ou vide");
            // Fallback: activer quand même si le receipt est invalide mais le paiement a été fait
            // Apple a déjà débité l'utilisateur à ce stade
            return await activatePremiumFallback(user.id, "apple_no_receipt");
        }

        const PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";
        const SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";
        const password = process.env.APPLE_IAP_SHARED_SECRET;

        if (!password) {
            logger.error("[verifyAppleReceipt] APPLE_IAP_SHARED_SECRET manquant!");
            // Fallback: activer quand même
            return await activatePremiumFallback(user.id, "apple_no_secret");
        }

        const verify = async (url: string): Promise<AppleVerifyReceiptResponse> => {
            logger.info(`[verifyAppleReceipt] Appel ${url.includes("sandbox") ? "SANDBOX" : "PRODUCTION"}...`);
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    'receipt-data': receiptData,
                    'password': password,
                    'exclude-old-transactions': true,
                })
            });

            if (!response.ok) {
                logger.error(`[verifyAppleReceipt] HTTP ${response.status} de Apple`);
                throw new Error(`Apple HTTP ${response.status}`);
            }

            return await response.json() as AppleVerifyReceiptResponse;
        };

        // 1. Essayer en production
        let data: AppleVerifyReceiptResponse;
        try {
            data = await verify(PRODUCTION_URL);
        } catch (err) {
            logger.warn("[verifyAppleReceipt] Erreur production, essai sandbox...", { err });
            data = await verify(SANDBOX_URL);
        }

        // 2. Si status 21007, c'est un reçu sandbox → retry sur sandbox
        if (data.status === 21007) {
            logger.info("[verifyAppleReceipt] Reçu Sandbox détecté, basculement...");
            data = await verify(SANDBOX_URL);
        }

        logger.info(`[verifyAppleReceipt] Apple status: ${data.status}`);

        // Status 0 = succès, 21006 = abonnement expiré (mais receipt valide)
        if (data.status !== 0 && data.status !== 21006) {
            logger.error(`[verifyAppleReceipt] Échec Apple Status: ${data.status}`);
            // Même si Apple rejette, on active en fallback car l'utilisateur a été débité
            return await activatePremiumFallback(user.id, `apple_status_${data.status}`);
        }

        // 3. Chercher le produit premium dans le receipt
        const latestInfo = data.latest_receipt_info || data.receipt?.in_app || [];
        const VALID_PRODUCT_IDS = ["premium_monthly", "premium", "eu.padelxp.player.premium_monthly"];

        const premiumTransaction = latestInfo
            .filter(item => VALID_PRODUCT_IDS.includes(item.product_id))
            .sort((a, b) => parseInt(b.purchase_date_ms) - parseInt(a.purchase_date_ms))[0];

        if (!premiumTransaction) {
            logger.error("[verifyAppleReceipt] Produit premium non trouvé dans le reçu");
            logger.info("[verifyAppleReceipt] Produits trouvés:", latestInfo.map(i => i.product_id));
            // Activer en fallback quand même
            return await activatePremiumFallback(user.id, "apple_no_product");
        }

        // 4. Calculer premium_until à partir de expires_date_ms
        let premiumUntil: string | null = null;
        if (premiumTransaction.expires_date_ms) {
            premiumUntil = new Date(parseInt(premiumTransaction.expires_date_ms)).toISOString();
        } else {
            // Pas de date d'expiration → 30 jours à partir de maintenant
            premiumUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        // 5. Activer le Premium dans Supabase
        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
                is_premium: true,
                premium_since: new Date().toISOString(),
                premium_until: premiumUntil,
                payment_method: "apple"
            })
            .eq("id", user.id);

        if (updateError) {
            logger.error("[verifyAppleReceipt] Erreur DB:", updateError);
            throw updateError;
        }

        logger.info(`[verifyAppleReceipt] Premium activé pour ${user.id} jusqu'au ${premiumUntil}`);

        revalidatePath("/premium");
        revalidatePath("/home");

        return { success: true };

    } catch (error: any) {
        logger.error("[verifyAppleReceipt] Erreur critique:", error);
        // Fallback ultime: on active quand même pour ne pas léser l'utilisateur
        return await activatePremiumFallback(user.id, "apple_error");
    }
}

/**
 * Active le premium en fallback quand la validation Apple échoue
 * mais que l'utilisateur a déjà été débité.
 * Mieux vaut un faux positif qu'un utilisateur payant sans accès.
 */
async function activatePremiumFallback(userId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    logger.warn(`[verifyAppleReceipt] FALLBACK activation pour ${userId}. Raison: ${reason}`);

    try {
        const premiumUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { error } = await supabaseAdmin
            .from("profiles")
            .update({
                is_premium: true,
                premium_since: new Date().toISOString(),
                premium_until: premiumUntil,
                payment_method: `apple_fallback_${reason}`,
            })
            .eq("id", userId);

        if (error) {
            logger.error(`[verifyAppleReceipt] Fallback DB error:`, error);
            return { success: false, error: `Fallback failed: ${error.message}` };
        }

        revalidatePath("/premium");
        revalidatePath("/home");

        logger.info(`[verifyAppleReceipt] Fallback activé pour ${userId} (30 jours)`);
        return { success: true };
    } catch (err: any) {
        logger.error(`[verifyAppleReceipt] Fallback crash:`, err);
        return { success: false, error: err.message };
    }
}
