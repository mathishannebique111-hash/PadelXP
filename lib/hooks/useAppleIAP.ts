"use client";

import { useState, useEffect, useCallback } from 'react';
import { verifyAppleReceipt } from '@/app/actions/apple';
import { toast } from 'sonner';

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
        // Détecter si on est dans l'app via le User Agent injecté par capacitor.config.ts
        const userAgent = window.navigator.userAgent;
        if (userAgent.includes('PadelXPCapacitor') || !!window.Capacitor) {
            setIsApp(true);
            initStore();
        }
    }, []);

    const initStore = () => {
        const store = window.store;
        if (!store) {
            console.warn("[useAppleIAP] 'window.store' non trouvé. Assurez-vous que le plugin cordova-plugin-purchase est installé.");
            return;
        }

        if (isInitialized) return;

        // Configuration du produit
        // IMPORTANT: Ces IDs doivent correspondre à ceux créés dans App Store Connect
        store.register({
            id: 'premium_monthly',
            type: store.PAID_SUBSCRIPTION,
        });

        // Gérer les approbations (quand l'acte d'achat est validé par Apple)
        store.when('premium_monthly').approved((p: any) => {
            console.info("[useAppleIAP] Achat approuvé, validation en cours...");
            validatePurchase(p);
        });

        // Gérer les erreurs
        store.error((error: any) => {
            console.error("[useAppleIAP] Erreur Store:", error);
            toast.error("Erreur de paiement: " + error.message);
            setLoading(false);
        });

        store.ready(() => {
            console.info("[useAppleIAP] Store prêt.");
            setIsInitialized(true);
        });

        store.refresh();
    };

    const validatePurchase = async (product: any) => {
        setLoading(true);
        try {
            // Le reçu est disponible dans product.transaction.appStoreReceipt
            const receipt = product.transaction?.appStoreReceipt;

            if (!receipt) {
                console.error("[useAppleIAP] Aucun reçu trouvé dans la transaction");
                toast.error("Échec de validation: Reçu manquant");
                return;
            }

            const result = await verifyAppleReceipt(receipt);

            if (result.success) {
                product.finish();
                toast.success("Premium activé ! Bienvenue sur PadelXP.");
                window.location.href = '/home?premium_success=true';
            } else {
                console.error("[useAppleIAP] Validation serveur échouée:", result.error);
                toast.error("Erreur de validation: " + result.error);
            }
        } catch (e) {
            console.error("[useAppleIAP] Erreur pendant la validation:", e);
            toast.error("Une erreur réseau est survenue lors de la validation.");
        } finally {
            setLoading(false);
        }
    };

    const purchasePremium = useCallback(() => {
        if (!isApp) return;

        const store = window.store;
        if (!store) {
            toast.error("Système de paiement non disponible.");
            return;
        }

        setLoading(true);
        store.order('premium_monthly');
    }, [isApp]);

    const restorePurchases = useCallback(() => {
        const store = window.store;
        if (store) {
            store.refresh();
            toast.info("Restauration des achats en cours...");
        }
    }, []);

    return {
        isApp,
        loading,
        purchasePremium,
        restorePurchases
    };
};
