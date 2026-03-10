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
 * Note: Cette implémentation est simplifiée pour permettre l'examen.
 * Pour une sécurité maximale en production, il faudrait appeler la Google Play Developer API.
 */
export async function verifyAndroidPurchase(purchaseData: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Non authentifié" };
    }

    try {
        logger.info(`[verifyAndroidPurchase] Début validation pour l'utilisateur ${user.id}`);

        // Dans un premier temps pour l'examen, on valide si l'ID produit est correct
        const productId = purchaseData.productId || purchaseData.product_id;
        
        if (productId !== "premium_monthly") {
            logger.error(`[verifyAndroidPurchase] Produit invalide: ${productId}`);
            return { success: false, error: "Produit non reconnu" };
        }

        // Activation du Premium dans Supabase
        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
                is_premium: true,
                premium_since: new Date().toISOString(),
                payment_method: "android"
            })
            .eq("id", user.id);

        if (updateError) {
            logger.error("[verifyAndroidPurchase] Erreur DB:", updateError);
            throw updateError;
        }

        logger.info(`[verifyAndroidPurchase] Premium activé avec succès pour ${user.id}`);

        revalidatePath("/premium");
        revalidatePath("/home");

        return { success: true };

    } catch (error: any) {
        logger.error("[verifyAndroidPurchase] Erreur critique:", error);
        return { success: false, error: error.message || "Erreur interne" };
    }
}
