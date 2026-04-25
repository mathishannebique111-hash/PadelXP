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
    const [product, setProduct] = useState<any>(null);

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

            addLog("[useIAP] Configuration du store v13...");

            const platform = Capacitor.getPlatform() === 'ios' 
                ? (window as any).CdvPurchase?.Platform?.APPLE_APPSTORE 
                : (window as any).CdvPurchase?.Platform?.GOOGLE_PLAY;
                
            addLog(`[useIAP] Platform detection: ${platform}`);

            // 1. Enregistrement des produits possibles
            const productIds = ['premium_monthly'];
            productIds.forEach(id => {
                store.register({
                    id: id,
                    type: (window as any).CdvPurchase?.ProductType?.PAID_SUBSCRIPTION || 'paid subscription',
                    platform: platform,
                });
            });

            // 2. Gestionnaires d'événements v13 (syntaxe sans argument dans .when())
            store.when()
                .productUpdated((p: any) => {
                    if (productIds.includes(p.id)) {
                        addLog(`[useAppleIAP] Produit chargé: ${p.id} - ${p.title} - ${p.pricing?.price || 'n/a'} - Valide: ${p.valid} - État: ${p.state}`);
                        setProduct(p);
                    }
                })
                .approved((transaction: any) => {
                    addLog(`[useAppleIAP] Transaction approuvée: ${transaction.transactionId}`);
                    if (transaction.products.some((p: any) => productIds.includes(p.id))) {
                        validatePurchase(transaction);
                    }
                })
                .verified((receipt: any) => {
                    addLog("[useAppleIAP] Reçu vérifié serveur.");
                    if (typeof receipt.finish === 'function') receipt.finish();
                });

            // Gérer les erreurs
            store.error((error: any) => {
                const errStr = JSON.stringify(error);
                addLog(`[useAppleIAP] Store Error: ${errStr}`);
                if (loading) toast.error("Erreur Apple Pay: " + (error.message || "inconnue"));
                setLoading(false);
            });

            store.ready(() => {
                addLog("[useAppleIAP] Store prêt (Ready).");
                setIsInitialized(true);
            });

            // 3. Initialisation v13 (Remplace refresh)
            addLog("[useAppleIAP] Appel de store.initialize...");
            store.initialize([platform]).then((errors: any) => {
                if (errors && errors.length > 0) {
                    addLog(`[useAppleIAP] Erreurs init: ${JSON.stringify(errors)}`);
                } else {
                    addLog("[useAppleIAP] store.initialize OK");
                }
            }).catch((err: any) => {
                addLog(`[useAppleIAP] store.initialize CRASH: ${err}`);
            });

        } catch (err: any) {
            const errorMessage = JSON.stringify(err, Object.getOwnPropertyNames(err));
            addLog(`[useAppleIAP] Erreur fatale init: ${errorMessage}`);
            toast.error("Erreur IAP Init: " + errorMessage);
            setLoading(false);
        }
    };

    const extractAppleReceipt = (transaction: any): string | undefined => {
        // cordova-plugin-purchase v13 (CdvPurchase) exposes the unified App Store receipt
        // at transaction.parentReceipt.nativeData.appStoreReceipt. Older paths kept as fallbacks.
        const candidates = [
            transaction?.nativeData?.appStoreReceipt,
            transaction?.parentReceipt?.nativeData?.appStoreReceipt,
            transaction?.appStoreReceipt,
            transaction?.parentReceipt?.nativeData?.transactionReceipt,
        ];
        for (const c of candidates) {
            if (typeof c === 'string' && c.length > 0) return c;
        }

        // Fallback: walk the store's local receipts to find any iOS receipt.
        const store = (window as any).CdvPurchase?.store || (window as any).store;
        const localReceipts = store?.localReceipts;
        if (Array.isArray(localReceipts)) {
            for (const r of localReceipts) {
                const platform = r?.platform || r?.type;
                if (platform === 'ios-appstore' || platform === 'apple-appstore') {
                    const data = r?.nativeData?.appStoreReceipt;
                    if (typeof data === 'string' && data.length > 0) return data;
                }
            }
        }

        // Last-resort: AppleAppStore adapter global
        const adapterReceipt = (window as any).CdvPurchase?.AppleAppStore?.AppStore?.appStoreReceipt;
        if (typeof adapterReceipt === 'string' && adapterReceipt.length > 0) return adapterReceipt;

        return undefined;
    };

    const validatePurchase = async (transaction: any) => {
        setLoading(true);
        try {
            const platform = Capacitor.getPlatform();

            // Pour Apple
            if (platform === 'ios') {
                const receipt = extractAppleReceipt(transaction);

                if (!receipt) {
                    const store = (window as any).CdvPurchase?.store || (window as any).store;
                    const diag = {
                        txKeys: transaction ? Object.keys(transaction) : [],
                        hasParent: !!transaction?.parentReceipt,
                        parentKeys: transaction?.parentReceipt ? Object.keys(transaction.parentReceipt) : [],
                        nativeKeys: transaction?.parentReceipt?.nativeData ? Object.keys(transaction.parentReceipt.nativeData) : [],
                        localReceipts: store?.localReceipts?.length ?? 0,
                    };
                    addLog(`[useIAP] Reçu Apple manquant. Diagnostic: ${JSON.stringify(diag)}`);
                    // IMPORTANT: do NOT finish() the transaction so Apple can replay it later
                    // (on app restart or via restorePurchases) once the plugin exposes the receipt.
                    toast.error("Reçu introuvable. Patientez quelques instants puis utilisez « Restaurer mes achats ».");
                    setLoading(false);
                    return;
                }

                const result = await verifyAppleReceipt(receipt);
                if (result.success) {
                    handleSuccess(transaction);
                } else {
                    addLog(`[useIAP] Échec validation Apple: ${result.error}`);
                    // Do NOT finish() on failure — let Apple replay the transaction so it can be retried.
                    toast.error("Validation impossible: " + result.error + ". Réessayez via « Restaurer mes achats ».");
                }
            }
            // Pour Android
            else if (platform === 'android') {
                const { verifyAndroidPurchase } = await import('@/app/actions/android');
                const result = await verifyAndroidPurchase({
                    productId: 'premium_monthly',
                    purchaseToken: transaction.receipt?.purchaseToken || transaction.transactionId
                });

                if (result.success) {
                    handleSuccess(transaction);
                } else {
                    addLog(`[useIAP] Échec validation Android: ${result.error}`);
                    toast.error("Échec de validation Android: " + result.error);
                }
            }
        } catch (e) {
            addLog(`[useIAP] Erreur validation: ${e}`);
            toast.error("Erreur lors de la vérification du paiement.");
        } finally {
            setLoading(false);
        }
    };

    const handleSuccess = async (transaction: any) => {
        addLog("[useIAP] Validation réussie !");
        if (typeof transaction.finish === 'function') await transaction.finish();
        toast.success("Succès ! Vous êtes maintenant Premium.");
        window.location.href = '/home?premium_success=true';
    };

    const purchasePremium = useCallback(() => {
        const store = (window as any).CdvPurchase?.store || (window as any).store;

        if (!store) {
            addLog("[useAppleIAP] Store non trouvé au clic.");
            toast.error("Le service d'achat n'est pas encore prêt.");
            return;
        }

        setLoading(true);
        try {
            const productId = 'premium_monthly';
            const productToBuy = store.get(productId);

            if (!productToBuy) {
                addLog(`[useAppleIAP] Produit introuvable: ${productId}`);
                toast.error("Produit introuvable sur le store.");
                setLoading(false);
                return;
            }

            // Diagnostic profond
            try {
                addLog(`[useAppleIAP] Diagnostic produit: ${productToBuy.id}`);
                const productShort = {
                    id: productToBuy.id,
                    state: productToBuy.state,
                    valid: productToBuy.valid,
                    canPurchase: productToBuy.canPurchase,
                    offersCount: productToBuy.offers?.length || 0
                };
                addLog(`[useAppleIAP] Détails: ${JSON.stringify(productShort)}`);
            } catch (e) {
                addLog(`[useAppleIAP] Erreur log détails: ${e}`);
            }

            const offer = productToBuy.getOffer();
            if (!offer) {
                addLog(`[useAppleIAP] Aucune offre trouvée pour ${productToBuy.id}. État: ${productToBuy.state}`);
                toast.error("Offre non disponible actuellement.");
                setLoading(false);
                return;
            }

            addLog(`[useAppleIAP] Lancement order sur offre: ${offer.id} (Type: ${offer.type})`);
            store.order(offer);
        } catch (err: any) {
            addLog(`[useAppleIAP] store.order failed: ${err}`);
            toast.error("Impossible d'ouvrir la fenêtre d'achat.");
            setLoading(false);
        }
    }, [loading, addLog]);

    const restorePurchases = useCallback(async () => {
        const store = (window as any).CdvPurchase?.store || (window as any).store;
        if (!store) {
            toast.error("Le service d'achat n'est pas prêt.");
            return;
        }

        try {
            setLoading(true);
            addLog("[useAppleIAP] Restauration des achats...");
            toast.info("Recherche de vos achats en cours...", { duration: 4000 });

            await store.restorePurchases();

            // On laisse un petit délai pour que la validation serveur ait le temps de répondre
            setTimeout(() => {
                setLoading(false);
            }, 3000);

        } catch (error: any) {
            addLog(`[useAppleIAP] Erreur lors de la restauration: ${error}`);
            toast.error("Erreur lors de la restauration.");
            setLoading(false);
        }
    }, []);

    const manageSubscriptions = useCallback(() => {
        const platform = Capacitor.getPlatform();
        if (platform === 'ios') {
            window.location.href = "https://apps.apple.com/account/subscriptions";
        } else if (platform === 'android') {
            window.location.href = "https://play.google.com/store/account/subscriptions";
        } else {
            toast.info("Veuillez gérer votre abonnement via les paramètres de votre compte.");
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
