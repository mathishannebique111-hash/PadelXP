"use client";

import { useState, useEffect, useCallback } from 'react';
import { verifyAppleReceipt } from '@/app/actions/apple';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

declare global {
    interface Window {
        store: any;
        Capacitor: any;
    }
}

export const useAppleIAP = () => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isApp, setIsApp] = useState(false);

    useEffect(() => {
        // Détecter si on est dans l'app via Capacitor
        try {
            const isNative = Capacitor.isNativePlatform();
            console.log("[useAppleIAP] Initial check - isNative:", isNative, "Platform:", Capacitor.getPlatform());

            if (isNative) {
                setIsApp(true);

                // On boucle jusqu'à trouver le store ou abandonner après 10s
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    const store = (window as any).CdvPurchase?.store || (window as any).store;

                    console.log(`[useAppleIAP] Attempt ${attempts}: store found?`, !!store);

                    if (store) {
                        clearInterval(interval);
                        initStore(store);
                    } else if (attempts >= 20) { // 10 secondes (20 * 500ms)
                        clearInterval(interval);
                        console.error("[useAppleIAP] Abandon : Store introuvable après 10s. Vérifiez que cordova-plugin-purchase est bien présent dans le build natif.");
                    }
                }, 500);

                return () => clearInterval(interval);
            }
        } catch (err) {
            console.error("[useAppleIAP] Error during initialization:", err);
        }
    }, []);

    const initStore = (store: any) => {
        try {
            if (isInitialized) return;

            console.log("[useAppleIAP] Initialisation du store avec IDs...");

            // Configuration du produit
            store.register({
                id: 'premium_monthly',
                type: store.PAID_SUBSCRIPTION || 'paid subscription',
            });

            // Gérer les approbations
            store.when('premium_monthly').approved((p: any) => {
                console.info("[useAppleIAP] Produit approuvé par l'App Store.");
                validatePurchase(p);
            });

            // Gérer les erreurs
            store.error((error: any) => {
                console.error("[useAppleIAP] Store Error Event:", error);
                if (loading) toast.error("Erreur In-App Purchase: " + (error.message || "inconnue"));
                setLoading(false);
            });

            store.ready(() => {
                console.info("[useAppleIAP] Store prêt et synchronisé.");
                setIsInitialized(true);
            });

            store.refresh();
        } catch (err) {
            console.error("[useAppleIAP] Erreur fatale dans initStore:", err);
        }
    };

    const validatePurchase = async (product: any) => {
        setLoading(true);
        try {
            const receipt = product.transaction?.appStoreReceipt || product.transaction?.receipt;

            if (!receipt) {
                toast.error("Reçu Apple manquant pour la validation.");
                return;
            }

            const result = await verifyAppleReceipt(receipt);

            if (result.success) {
                if (typeof product.finish === 'function') product.finish();
                toast.success("Succès ! Vous êtes maintenant Premium.");
                window.location.href = '/home?premium_success=true';
            } else {
                toast.error("Échec de validation serveur: " + result.error);
            }
        } catch (e) {
            toast.error("Erreur réseau (vérification du reçu).");
        } finally {
            setLoading(false);
        }
    };

    const purchasePremium = useCallback(() => {
        const store = (window as any).CdvPurchase?.store || (window as any).store;

        if (!store) {
            console.error("[useAppleIAP] Store non trouvé au clic.");
            toast.error("Le service de paiement d'Apple n'est pas encore prêt. Réessayez dans un instant.");
            return;
        }

        setLoading(true);
        try {
            console.log("[useAppleIAP] Lancement store.order('premium_monthly')...");
            store.order('premium_monthly');
        } catch (err) {
            console.error("[useAppleIAP] store.order failed:", err);
            toast.error("Impossible d'ouvrir la fenêtre d'achat Apple.");
            setLoading(false);
        }
    }, [loading]);

    const restorePurchases = useCallback(() => {
        const store = (window as any).CdvPurchase?.store || (window as any).store;
        if (store) {
            store.refresh();
            toast.info("Restauration des achats demandée...");
        }
    }, []);

    return {
        isApp,
        loading,
        purchasePremium,
        restorePurchases
    };
};
