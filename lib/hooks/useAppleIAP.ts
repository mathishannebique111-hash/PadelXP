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
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        console.log(msg);
        setDebugLogs(prev => [...prev.slice(-19), msg]); // Garder les 20 derniers logs
    };

    useEffect(() => {
        // Détecter si on est dans l'app via Capacitor
        try {
            const isNative = Capacitor.isNativePlatform();
            addLog(`[useAppleIAP] Initial check - isNative: ${isNative}, Platform: ${Capacitor.getPlatform()}`);

            if (isNative) {
                setIsApp(true);

                // On boucle jusqu'à trouver le store ou abandonner après 10s
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    const store = (window as any).CdvPurchase?.store || (window as any).store;

                    addLog(`[useAppleIAP] Attempt ${attempts}: store found? ${!!store}`);

                    if (store) {
                        clearInterval(interval);
                        initStore(store);
                    } else if (attempts >= 20) { // 10 secondes (20 * 500ms)
                        clearInterval(interval);
                        addLog("[useAppleIAP] Abandon : Store introuvable après 10s.");
                    }
                }, 500);

                return () => clearInterval(interval);
            }
        } catch (err) {
            addLog(`[useAppleIAP] Error during initialization: ${err}`);
        }
    }, []);

    const initStore = (store: any) => {
        try {
            if (isInitialized) return;

            addLog("[useAppleIAP] Initialisation du store...");

            const platform = (window as any).CdvPurchase?.Platform?.APPLE_APPSTORE || 'ios-appstore';
            addLog(`[useAppleIAP] Debug - Platform: ${platform}`);

            // Configuration du produit
            addLog("[useAppleIAP] Appel de store.register...");
            store.register({
                id: 'premium_monthly',
                type: store.PAID_SUBSCRIPTION || 'paid subscription',
                platform: platform,
            });
            addLog("[useAppleIAP] store.register OK");

            // Gérer les approbations
            store.when('premium_monthly').approved((p: any) => {
                addLog("[useAppleIAP] Produit approuvé par l'App Store.");
                validatePurchase(p);
            });

            // Gérer les erreurs
            store.error((error: any) => {
                addLog(`[useAppleIAP] Store Error: ${JSON.stringify(error)}`);
                if (loading) toast.error("Erreur In-App Purchase: " + (error.message || "inconnue"));
                setLoading(false);
            });

            store.ready(() => {
                addLog("[useAppleIAP] Store prêt et synchronisé.");
                setIsInitialized(true);
            });

            addLog("[useAppleIAP] Appel de store.refresh...");
            store.refresh();
            addLog("[useAppleIAP] store.refresh OK");
        } catch (err: any) {
            const errorMessage = JSON.stringify(err, Object.getOwnPropertyNames(err));
            addLog(`[useAppleIAP] Erreur fatale: ${errorMessage}`);
            toast.error("Erreur IAP Init: " + errorMessage);
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
            addLog("[useAppleIAP] Store non trouvé au clic.");
            toast.error("Service Apple non prêt. Voir logs en bas.");
            return;
        }

        setLoading(true);
        try {
            addLog("[useAppleIAP] Lancement store.order('premium_monthly')...");
            store.order('premium_monthly');
        } catch (err: any) {
            addLog(`[useAppleIAP] store.order failed: ${err}`);
            toast.error("Impossible d'ouvrir la fenêtre d'achat Apple.");
            setLoading(false);
        }
    }, [loading, addLog]);

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
        restorePurchases,
        debugLogs
    };
};
