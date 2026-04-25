"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
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
    const [product, setProduct] = useState<any>(null);
    const storeRef = useRef<any>(null);
    const userInitiatedRef = useRef(false); // Only validate when user clicks buy/restore

    const addLog = useCallback((msg: string) => {
        console.log(msg);
        setDebugLogs(prev => [...prev.slice(-29), msg]);
    }, []);

    /**
     * Extracts the App Store receipt from ANY possible location.
     * cordova-plugin-purchase v13 stores it in various places depending on the flow.
     */
    const extractReceipt = useCallback((transaction?: any): string => {
        const CdvPurchase = (window as any).CdvPurchase;
        const store = storeRef.current;

        // Try all known paths (ordered by likelihood)
        const paths = [
            // v13 application receipt (the most reliable)
            () => store?.applicationReceipt?.nativeData?.appStoreReceipt,
            // CdvPurchase global receipt
            () => CdvPurchase?.store?.applicationReceipt?.nativeData?.appStoreReceipt,
            // Transaction-level receipt
            () => transaction?.appStoreReceipt,
            () => transaction?.parentReceipt?.nativeData?.appStoreReceipt,
            () => transaction?.parentReceipt?.nativeData?.transactionReceipt,
            () => transaction?.nativeData?.appStoreReceipt,
            () => transaction?.receipt,
            // Legacy global
            () => CdvPurchase?.appStoreReceipt,
            // Local receipts array
            () => store?.localReceipts?.[0]?.nativeData?.appStoreReceipt,
        ];

        for (let i = 0; i < paths.length; i++) {
            try {
                const receipt = paths[i]();
                if (receipt && typeof receipt === 'string' && receipt.length > 100) {
                    addLog(`[IAP] Receipt trouvé via path ${i} (${receipt.length} chars)`);
                    return receipt;
                }
            } catch { /* ignore */ }
        }

        addLog("[IAP] Aucun receipt trouvé dans les paths connus");
        return "";
    }, [addLog]);

    /**
     * Validate a purchase with our server.
     * Called both for new purchases AND restore flows.
     */
    const validateAndActivate = useCallback(async (transaction?: any) => {
        setLoading(true);
        addLog("[IAP] Début validation...");

        try {
            const platform = Capacitor.getPlatform();

            if (platform === 'ios') {
                const receipt = extractReceipt(transaction);
                addLog(`[IAP] Envoi au serveur (receipt: ${receipt ? receipt.length + ' chars' : 'vide'})...`);

                const result = await verifyAppleReceipt(receipt);
                addLog(`[IAP] Réponse serveur: success=${result.success}, error=${result.error || 'none'}`);

                if (result.success) {
                    addLog("[IAP] Premium activé !");
                    // Finish the transaction so Apple doesn't keep retrying
                    if (transaction && typeof transaction.finish === 'function') {
                        try { await transaction.finish(); } catch { /* ok */ }
                    }
                    toast.success("Succès ! Vous êtes maintenant Premium.");
                    window.location.href = '/home?premium_success=true';
                    return;
                } else {
                    toast.error("Échec de validation: " + (result.error || "erreur inconnue"));
                }
            } else if (platform === 'android') {
                const { verifyAndroidPurchase } = await import('@/app/actions/android');
                const result = await verifyAndroidPurchase({
                    productId: 'premium_monthly',
                    purchaseToken: transaction?.receipt?.purchaseToken || transaction?.transactionId || ''
                });

                if (result.success) {
                    if (transaction && typeof transaction.finish === 'function') {
                        try { await transaction.finish(); } catch { /* ok */ }
                    }
                    toast.success("Succès ! Vous êtes maintenant Premium.");
                    window.location.href = '/home?premium_success=true';
                    return;
                } else {
                    toast.error("Échec de validation Android: " + (result.error || "erreur inconnue"));
                }
            }
        } catch (e: any) {
            addLog(`[IAP] Erreur validation: ${e.message || e}`);
            toast.error("Erreur lors de la vérification du paiement.");
        } finally {
            setLoading(false);
        }
    }, [addLog, extractReceipt]);

    /**
     * Initialize the store and set up event handlers.
     */
    const initStore = useCallback((store: any) => {
        if (storeRef.current) return; // Already initialized
        storeRef.current = store;

        addLog("[IAP] Configuration du store v13...");

        try {
            const CdvPurchase = (window as any).CdvPurchase;
            const platform = Capacitor.getPlatform() === 'ios'
                ? CdvPurchase?.Platform?.APPLE_APPSTORE
                : CdvPurchase?.Platform?.GOOGLE_PLAY;

            addLog(`[IAP] Platform: ${platform}`);

            // Register products
            store.register({
                id: 'premium_monthly',
                type: CdvPurchase?.ProductType?.PAID_SUBSCRIPTION || 'paid subscription',
                platform: platform,
            });

            // Event handlers
            store.when()
                .productUpdated((p: any) => {
                    if (p.id === 'premium_monthly') {
                        addLog(`[IAP] Produit: ${p.id} - ${p.pricing?.price || 'n/a'} - valid=${p.valid} - state=${p.state} - owned=${p.owned}`);
                        setProduct(p);
                        // Do NOT auto-validate on owned — the Apple ID subscription
                        // belongs to the device, not the PadelXP account.
                        // Only validate on explicit purchase or restore.
                    }
                })
                .approved((transaction: any) => {
                    addLog(`[IAP] Transaction approuvée: ${transaction.transactionId || 'unknown'}, userInitiated=${userInitiatedRef.current}`);
                    // Only validate if user explicitly clicked buy or restore
                    // Otherwise the store fires .approved() on init for existing subscriptions
                    // which would activate premium for the wrong PadelXP account
                    if (userInitiatedRef.current) {
                        validateAndActivate(transaction);
                    } else {
                        addLog("[IAP] Ignoré: transaction non initiée par l'utilisateur");
                        // Still finish the transaction to clear the queue
                        if (typeof transaction.finish === 'function') transaction.finish();
                    }
                })
                .verified((receipt: any) => {
                    addLog("[IAP] Receipt vérifié par le plugin.");
                    if (typeof receipt.finish === 'function') receipt.finish();
                })
                .finished((transaction: any) => {
                    addLog(`[IAP] Transaction terminée: ${transaction.transactionId || 'unknown'}`);
                });

            store.error((error: any) => {
                addLog(`[IAP] Store Error: ${JSON.stringify(error)}`);
                setLoading(false);
            });

            store.ready(() => {
                addLog("[IAP] Store prêt.");
                setIsInitialized(true);
            });

            // Initialize
            addLog("[IAP] Initialisation...");
            store.initialize([platform]).then((errors: any) => {
                if (errors?.length > 0) {
                    addLog(`[IAP] Erreurs init: ${JSON.stringify(errors)}`);
                } else {
                    addLog("[IAP] Init OK");
                }
            }).catch((err: any) => {
                addLog(`[IAP] Init crash: ${err}`);
            });

        } catch (err: any) {
            addLog(`[IAP] Erreur fatale init: ${err.message || err}`);
            toast.error("Erreur d'initialisation des achats");
            setLoading(false);
        }
    }, [addLog, validateAndActivate]);

    // Detect native platform and initialize store
    useEffect(() => {
        try {
            const isNative = Capacitor.isNativePlatform();
            addLog(`[IAP] isNative=${isNative}, platform=${Capacitor.getPlatform()}`);

            if (!isNative) return;
            setIsApp(true);

            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                const store = (window as any).CdvPurchase?.store;

                if (store) {
                    clearInterval(interval);
                    initStore(store);
                } else if (attempts >= 20) {
                    clearInterval(interval);
                    addLog("[IAP] Store introuvable après 10s");
                }
            }, 500);

            return () => clearInterval(interval);
        } catch (err) {
            addLog(`[IAP] Init error: ${err}`);
        }
    }, [addLog, initStore]);

    // Purchase premium
    const purchasePremium = useCallback(() => {
        const store = storeRef.current;
        if (!store) {
            toast.error("Le service d'achat n'est pas encore prêt.");
            return;
        }

        setLoading(true);
        userInitiatedRef.current = true;
        try {
            const prod = store.get('premium_monthly');
            if (!prod) {
                addLog("[IAP] Produit introuvable");
                toast.error("Produit introuvable.");
                setLoading(false);
                return;
            }

            addLog(`[IAP] Produit: id=${prod.id}, valid=${prod.valid}, canPurchase=${prod.canPurchase}, offers=${prod.offers?.length || 0}`);

            const offer = prod.getOffer();
            if (!offer) {
                addLog("[IAP] Aucune offre disponible");
                toast.error("Offre non disponible.");
                setLoading(false);
                return;
            }

            addLog(`[IAP] Achat: offre ${offer.id}`);
            store.order(offer);
        } catch (err: any) {
            addLog(`[IAP] Erreur order: ${err}`);
            toast.error("Impossible d'ouvrir le paiement.");
            setLoading(false);
        }
    }, [addLog]);

    // Restore purchases
    const restorePurchases = useCallback(async () => {
        const store = storeRef.current;
        if (!store) {
            toast.error("Le service d'achat n'est pas prêt.");
            return;
        }

        setLoading(true);
        userInitiatedRef.current = true;
        addLog("[IAP] Restauration des achats...");
        toast.info("Recherche de vos achats...", { duration: 4000 });

        try {
            await store.restorePurchases();
            addLog("[IAP] restorePurchases() appelé, attente de la réponse...");

            // Wait a bit for the store to process, then check if product is owned
            setTimeout(async () => {
                const prod = store.get('premium_monthly');
                addLog(`[IAP] Après restore: owned=${prod?.owned}, state=${prod?.state}`);

                if (prod?.owned) {
                    addLog("[IAP] Produit possédé après restore, validation...");
                    await validateAndActivate(undefined);
                } else {
                    // Try to validate with whatever receipt we have anyway
                    const receipt = extractReceipt();
                    if (receipt) {
                        addLog("[IAP] Receipt trouvé après restore, tentative de validation...");
                        await validateAndActivate(undefined);
                    } else {
                        addLog("[IAP] Aucun achat trouvé à restaurer");
                        toast.info("Aucun achat premium trouvé à restaurer.");
                        setLoading(false);
                    }
                }
            }, 3000);
        } catch (error: any) {
            addLog(`[IAP] Erreur restore: ${error}`);
            toast.error("Erreur lors de la restauration.");
            setLoading(false);
        }
    }, [addLog, validateAndActivate, extractReceipt]);

    // Manage subscriptions
    const manageSubscriptions = useCallback(() => {
        const platform = Capacitor.getPlatform();
        if (platform === 'ios') {
            window.location.href = "https://apps.apple.com/account/subscriptions";
        } else if (platform === 'android') {
            window.location.href = "https://play.google.com/store/account/subscriptions";
        }
    }, []);

    return {
        isApp,
        loading,
        product,
        purchasePremium,
        restorePurchases,
        manageSubscriptions,
        debugLogs
    };
};
