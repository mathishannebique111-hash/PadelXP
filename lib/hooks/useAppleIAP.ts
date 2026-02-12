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
            console.log("[useAppleIAP] Platform check:", { isNative, platform: Capacitor.getPlatform() });

            if (isNative) {
                setIsApp(true);
                // On attend un peu que les plugins soient injectés (CdvPurchase...)
                const timer = setTimeout(() => {
                    initStore();
                }, 1000);
                return () => clearTimeout(timer);
            }
        } catch (err) {
            console.error("[useAppleIAP] Error during platform detection:", err);
        }
    }, []);

    const initStore = () => {
        try {
            // Support v13 (CdvPurchase) et v11 (store)
            const store = (window as any).CdvPurchase?.store || (window as any).store;

            if (!store) {
                console.warn("[useAppleIAP] Store non trouvé sur window. Attente possible...");
                return;
            }

            if (isInitialized) return;

            console.log("[useAppleIAP] Initialisation du store...");

            // Configuration du produit
            store.register({
                id: 'premium_monthly',
                type: store.PAID_SUBSCRIPTION || 'paid subscription',
            });

            // Gérer les approbations
            store.when('premium_monthly').approved((p: any) => {
                console.info("[useAppleIAP] Achat approuvé.");
                validatePurchase(p);
            });

            // Gérer les erreurs
            store.error((error: any) => {
                console.error("[useAppleIAP] Store Error:", error);
                // Toast seulement si on est en train d'essayer d'acheter pour pas polluer
                if (loading) toast.error("Erreur Store: " + (error.message || "inconnue"));
                setLoading(false);
            });

            store.ready(() => {
                console.info("[useAppleIAP] Store prêt.");
                setIsInitialized(true);
            });

            store.refresh();
        } catch (err) {
            console.error("[useAppleIAP] Erreur critique lors de initStore:", err);
        }
    };

    const validatePurchase = async (product: any) => {
        setLoading(true);
        try {
            // Dans v13 c'est parfois transaction.appStoreReceipt
            const receipt = product.transaction?.appStoreReceipt || product.transaction?.receipt;

            if (!receipt) {
                toast.error("Reçu Apple introuvable.");
                return;
            }

            const result = await verifyAppleReceipt(receipt);

            if (result.success) {
                if (typeof product.finish === 'function') product.finish();
                toast.success("Premium activé !");
                window.location.href = '/home?premium_success=true';
            } else {
                toast.error("Échec de validation: " + result.error);
            }
        } catch (e) {
            toast.error("Erreur réseau lors de la validation.");
        } finally {
            setLoading(false);
        }
    };

    const purchasePremium = useCallback(() => {
        const store = (window as any).CdvPurchase?.store || (window as any).store;

        if (!store) {
            toast.error("Le service de paiement d'Apple n'est pas encore prêt.");
            return;
        }

        setLoading(true);
        try {
            store.order('premium_monthly');
        } catch (err) {
            console.error("[useAppleIAP] Order failed:", err);
            toast.error("Impossible de lancer l'achat.");
            setLoading(false);
        }
    }, []);

    const restorePurchases = useCallback(() => {
        const store = (window as any).CdvPurchase?.store || (window as any).store;
        if (store) {
            store.refresh();
            toast.info("Restauration en cours...");
        }
    }, []);

    return {
        isApp,
        loading,
        purchasePremium,
        restorePurchases
    };
};
