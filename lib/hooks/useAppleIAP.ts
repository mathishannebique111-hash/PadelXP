"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { verifyAppleReceipt } from '@/app/actions/apple';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

export const useAppleIAP = () => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isApp, setIsApp] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [product, setProduct] = useState<any>(null);
    const storeRef = useRef<any>(null);
    const userInitiatedRef = useRef(false);

    const addLog = useCallback((msg: string) => {
        console.log(msg);
        setDebugLogs(prev => [...prev.slice(-29), msg]);
    }, []);

    // Extract receipt from all possible locations
    const extractReceipt = useCallback((): string => {
        const store = storeRef.current;
        const CdvPurchase = (window as any).CdvPurchase;

        const paths = [
            () => store?.applicationReceipt?.nativeData?.appStoreReceipt,
            () => CdvPurchase?.store?.applicationReceipt?.nativeData?.appStoreReceipt,
            () => CdvPurchase?.appStoreReceipt,
            () => store?.localReceipts?.[0]?.nativeData?.appStoreReceipt,
        ];

        for (let i = 0; i < paths.length; i++) {
            try {
                const r = paths[i]();
                if (r && typeof r === 'string' && r.length > 100) {
                    addLog(`[IAP] Receipt path ${i}: ${r.length} chars`);
                    return r;
                }
            } catch { /* */ }
        }
        return "";
    }, [addLog]);

    // Server validation + premium activation
    const serverValidate = useCallback(async (receipt: string, transaction?: any): Promise<boolean> => {
        addLog(`[IAP] Server validation (receipt: ${receipt ? receipt.length + ' chars' : 'vide'})...`);

        try {
            const platform = Capacitor.getPlatform();

            if (platform === 'ios') {
                const result = await verifyAppleReceipt(receipt);
                addLog(`[IAP] Server result: success=${result.success}, error=${result.error || 'none'}`);
                return result.success;
            } else if (platform === 'android') {
                // Extract purchaseToken from various v13 locations
                let purchaseToken = '';
                try {
                    // v13: nativePurchase has the token directly
                    purchaseToken = transaction?.nativePurchase?.purchaseToken
                        || transaction?.purchaseToken
                        || '';

                    // receipt might be a JSON string containing the token
                    if (!purchaseToken && transaction?.receipt) {
                        try {
                            const parsed = typeof transaction.receipt === 'string'
                                ? JSON.parse(transaction.receipt)
                                : transaction.receipt;
                            purchaseToken = parsed?.purchaseToken || parsed?.purchase_token || '';
                        } catch { /* not JSON */ }
                    }

                    // Fallback to transactionId
                    if (!purchaseToken) {
                        purchaseToken = transaction?.transactionId || '';
                    }
                } catch { /* */ }

                addLog(`[IAP] Android purchaseToken: ${purchaseToken ? purchaseToken.slice(0, 20) + '...' : 'EMPTY'}`);

                const { verifyAndroidPurchase } = await import('@/app/actions/android');
                const result = await verifyAndroidPurchase({
                    productId: 'premium_monthly',
                    purchaseToken,
                });
                return result.success;
            }
        } catch (e: any) {
            addLog(`[IAP] Server validation error: ${e.message || e}`);
        }
        return false;
    }, [addLog]);

    // Initialize store
    const initStore = useCallback((store: any) => {
        if (storeRef.current) return;
        storeRef.current = store;

        const CdvPurchase = (window as any).CdvPurchase;
        const platform = Capacitor.getPlatform() === 'ios'
            ? CdvPurchase?.Platform?.APPLE_APPSTORE
            : CdvPurchase?.Platform?.GOOGLE_PLAY;

        addLog(`[IAP] Init store, platform=${platform}`);

        try {
            store.register({
                id: 'premium_monthly',
                type: CdvPurchase?.ProductType?.PAID_SUBSCRIPTION || 'paid subscription',
                platform,
            });

            store.when()
                .productUpdated((p: any) => {
                    if (p.id === 'premium_monthly') {
                        addLog(`[IAP] Product: ${p.id} price=${p.pricing?.price || '?'} valid=${p.valid} owned=${p.owned}`);
                        setProduct(p);
                    }
                })
                .approved((transaction: any) => {
                    addLog(`[IAP] APPROVED: txId=${transaction.transactionId || '?'}, userInitiated=${userInitiatedRef.current}, platform=${Capacitor.getPlatform()}`);

                    // Log transaction structure for debugging (truncated)
                    try {
                        const keys = Object.keys(transaction).filter(k => typeof transaction[k] !== 'function');
                        addLog(`[IAP] Transaction keys: ${keys.join(', ')}`);
                        if (transaction.nativePurchase) {
                            addLog(`[IAP] nativePurchase keys: ${Object.keys(transaction.nativePurchase).join(', ')}`);
                        }
                    } catch { /* */ }

                    if (!userInitiatedRef.current) {
                        addLog("[IAP] Not user initiated, finishing silently");
                        transaction.finish();
                        return;
                    }

                    // Follow the proper v13 flow: approved → verify → verified → finish
                    // We do our own server validation, then call finish
                    (async () => {
                        try {
                            // Extract receipt (may come from transaction or global store)
                            const receipt =
                                transaction.appStoreReceipt ||
                                transaction.parentReceipt?.nativeData?.appStoreReceipt ||
                                transaction.nativeData?.appStoreReceipt ||
                                extractReceipt();

                            const success = await serverValidate(receipt || "", transaction);

                            // Always finish the transaction to unblock the store queue
                            try { transaction.finish(); } catch { /* */ }

                            if (success) {
                                addLog("[IAP] SUCCESS! Redirecting...");
                                toast.success("Succès ! Vous êtes maintenant Premium.", { duration: 2000 });
                                setLoading(false);
                                userInitiatedRef.current = false;
                                // Wait for toast, then force full reload to trigger PremiumSuccessNotifier
                                setTimeout(() => {
                                    window.location.replace('/home?premium_success=true');
                                    // Force reload in case replace doesn't trigger a full navigation in Capacitor
                                    setTimeout(() => window.location.reload(), 300);
                                }, 1500);
                            } else {
                                addLog("[IAP] Server validation failed");
                                toast.error("Échec de la validation. Contactez le support.");
                                setLoading(false);
                                userInitiatedRef.current = false;
                            }
                        } catch (e: any) {
                            addLog(`[IAP] Validation error in approved: ${e.message || e}`);
                            try { transaction.finish(); } catch { /* */ }
                            toast.error("Erreur de validation.");
                            setLoading(false);
                            userInitiatedRef.current = false;
                        }
                    })();
                })
                .verified((receipt: any) => {
                    addLog("[IAP] VERIFIED by plugin");
                    receipt.finish();
                })
                .finished((transaction: any) => {
                    addLog(`[IAP] FINISHED: ${transaction.transactionId || '?'}`);
                });

            store.error((error: any) => {
                addLog(`[IAP] ERROR: ${JSON.stringify(error)}`);
                toast.error("Erreur: " + (error.message || "inconnue"));
                setLoading(false);
                userInitiatedRef.current = false;
            });

            store.ready(() => {
                addLog("[IAP] Store READY");
                setIsInitialized(true);
            });

            store.initialize([platform]).then((errors: any) => {
                if (errors?.length > 0) {
                    addLog(`[IAP] Init errors: ${JSON.stringify(errors)}`);
                } else {
                    addLog("[IAP] Init OK");
                }
            }).catch((err: any) => {
                addLog(`[IAP] Init crash: ${err}`);
            });
        } catch (err: any) {
            addLog(`[IAP] Fatal init error: ${err.message || err}`);
            setLoading(false);
        }
    }, [addLog, extractReceipt, serverValidate]);

    // Detect platform + init
    useEffect(() => {
        try {
            if (!Capacitor.isNativePlatform()) return;
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
                    addLog("[IAP] Store not found after 10s");
                }
            }, 500);

            return () => clearInterval(interval);
        } catch (err) {
            addLog(`[IAP] Platform detection error: ${err}`);
        }
    }, [addLog, initStore]);

    // Purchase
    const purchasePremium = useCallback(() => {
        const store = storeRef.current;
        if (!store) {
            toast.error("Le service d'achat n'est pas encore prêt.");
            return;
        }

        const prod = store.get('premium_monthly');
        if (!prod) {
            toast.error("Produit introuvable.");
            return;
        }

        const offer = prod.getOffer();
        if (!offer) {
            toast.error("Offre non disponible.");
            return;
        }

        addLog(`[IAP] Purchasing offer ${offer.id}...`);
        userInitiatedRef.current = true;
        setLoading(true);
        store.order(offer);
    }, [addLog]);

    // Restore
    const restorePurchases = useCallback(async () => {
        const store = storeRef.current;
        if (!store) {
            toast.error("Le service d'achat n'est pas prêt.");
            return;
        }

        addLog("[IAP] Restoring purchases...");
        userInitiatedRef.current = true;
        setLoading(true);
        toast.info("Recherche de vos achats...", { duration: 4000 });

        try {
            await store.restorePurchases();

            // Wait for store to process, then check + validate
            setTimeout(async () => {
                const receipt = extractReceipt();
                if (receipt) {
                    addLog("[IAP] Receipt found after restore, validating...");
                    const success = await serverValidate(receipt);
                    if (success) {
                        toast.success("Succès ! Votre premium a été restauré.", { duration: 2000 });
                        setLoading(false);
                        userInitiatedRef.current = false;
                        setTimeout(() => {
                            window.location.replace('/home?premium_success=true');
                            setTimeout(() => window.location.reload(), 300);
                        }, 1500);
                        return;
                    }
                }

                addLog("[IAP] No valid receipt after restore");
                toast.info("Aucun achat premium trouvé.");
                setLoading(false);
                userInitiatedRef.current = false;
            }, 3000);
        } catch (error: any) {
            addLog(`[IAP] Restore error: ${error}`);
            toast.error("Erreur lors de la restauration.");
            setLoading(false);
            userInitiatedRef.current = false;
        }
    }, [addLog, extractReceipt, serverValidate]);

    // Manage subscriptions
    const manageSubscriptions = useCallback(() => {
        const platform = Capacitor.getPlatform();
        if (platform === 'ios') {
            window.location.href = "https://apps.apple.com/account/subscriptions";
        } else if (platform === 'android') {
            window.location.href = "https://play.google.com/store/account/subscriptions";
        }
    }, []);

    return { isApp, loading, product, purchasePremium, restorePurchases, manageSubscriptions, debugLogs };
};
