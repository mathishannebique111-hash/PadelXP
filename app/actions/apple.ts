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
 * Interface pour la réponse de vérification d'Apple.
 */
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
}

/**
 * Valide un reçu Apple In-App Purchase et active le premium.
 */
export async function verifyAppleReceipt(receiptData: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Non authentifié" };
    }

    try {
        logger.info(`[verifyAppleReceipt] Début validation pour l'utilisateur ${user.id}`);

        // URLs d'Apple pour la vérification des reçus
        const PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";
        const SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";

        // Secret de partage Apple (à configurer dans .env.local)
        const password = process.env.APPLE_IAP_SHARED_SECRET;

        const verify = async (url: string) => {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 'receipt-data': receiptData, password })
            });
            return await response.json() as AppleVerifyReceiptResponse;
        };

        // 1. Essayer en production d'abord
        let data = await verify(PRODUCTION_URL);

        // 2. Si status est 21007, c'est un reçu de sandbox envoyé en prod, donc on réessaye sur la sandbox
        if (data.status === 21007) {
            logger.info("[verifyAppleReceipt] Reçu Sandbox détecté, basculement...");
            data = await verify(SANDBOX_URL);
        }

        if (data.status !== 0) {
            logger.error(`[verifyAppleReceipt] Échec Apple Status: ${data.status}`);
            return { success: false, error: `Erreur Apple: ${data.status}` };
        }

        // 3. Vérifier que le produit premium est bien présent
        const latestInfo = data.latest_receipt_info || data.receipt?.in_app;
        const hasPremium = latestInfo?.some(item =>
            item.product_id === "premium_monthly" || // Remplace par ton ID réel
            item.product_id === "premium"
        );

        if (!hasPremium) {
            logger.error("[verifyAppleReceipt] Produit premium non trouvé dans le reçu");
            return { success: false, error: "Produit non trouvé" };
        }

        // 4. Activer le Premium dans Supabase
        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
                is_premium: true,
                premium_since: new Date().toISOString(),
                payment_method: "apple"
            })
            .eq("id", user.id);

        if (updateError) {
            logger.error("[verifyAppleReceipt] Erreur DB:", updateError);
            throw updateError;
        }

        logger.info(`[verifyAppleReceipt] Premium activé avec succès pour ${user.id}`);

        revalidatePath("/premium");
        revalidatePath("/home");

        return { success: true };

    } catch (error: any) {
        logger.error("[verifyAppleReceipt] Erreur critique:", error);
        return { success: false, error: error.message || "Erreur interne" };
    }
}
