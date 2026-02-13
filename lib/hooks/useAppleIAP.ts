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

            addLog("[useAppleIAP] Configuration du store v13...");

            const platform = (window as any).CdvPurchase?.Platform?.APPLE_APPSTORE || 'ios-appstore';
            addLog(`[useAppleIAP] Platform: ${platform}`);

            // 1. Enregistrement des produits possibles
            const productIds = ['premium_monthly', 'premium'];
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

    const validatePurchase = async (transaction: any) => {
        setLoading(true);
        try {
            // En v13, le reçu est souvent dans transaction.parentReceipt.nativeData ou via le store
            const receipt = transaction.appStoreReceipt ||
                transaction.parentReceipt?.nativeData?.transactionReceipt ||
                (window as any).CdvPurchase?.appStoreReceipt; // Fallback possible

            addLog(`[useAppleIAP] Validation du reçu (longueur: ${receipt?.length || 0})`);

            if (!receipt) {
                addLog("[useAppleIAP] Erreur: Reçu manquant dans la transaction.");
                toast.error("Le reçu de paiement n'a pas pu être récupéré.");
                setLoading(false);
                return;
            }

            const result = await verifyAppleReceipt(receipt);

            if (result.success) {
                addLog("[useAppleIAP] Validation serveur réussie !");
                if (typeof transaction.finish === 'function') await transaction.finish();
                toast.success("Succès ! Vous êtes maintenant Premium.");
                window.location.href = '/home?premium_success=true';
            } else {
                addLog(`[useAppleIAP] Échec validation serveur: ${result.error}`);
                toast.error("Échec de validation: " + result.error);
                setLoading(false);
            }
        } catch (e) {
            addLog(`[useAppleIAP] Erreur réseau validation: ${e}`);
            toast.error("Erreur réseau lors de la vérification.");
            setLoading(false);
        }
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
            const productIds = ['premium_monthly', 'premium'];
            let product = null;

            for (const id of productIds) {
                product = store.get(id);
                if (product) {
                    addLog(`[useAppleIAP] Produit trouvé: ${id}`);
                    break;
                }
            }

            if (!product) {
                addLog(`[useAppleIAP] Aucun produit trouvé parmi: ${productIds.join(', ')}`);
                toast.error("Produit introuvable sur le store.");
                setLoading(false);
                return;
            }

            addLog(`[useAppleIAP] Produit ID: ${product.id}, Valide: ${product.valid}, État: ${product.state}, Titre: ${product.title}`);

            const offer = product.getOffer();
            if (!offer) {
                addLog(`[useAppleIAP] Aucune offre trouvée pour ${product.id}. Produit prêt? ${product.state === 'valid' || product.state === 'approved'}`);
                toast.error("Offre non disponible actuellement.");
                setLoading(false);
                return;
            }

            addLog(`[useAppleIAP] Lancement order sur offre: ${offer.id} (Product: ${product.id})`);
            store.order(offer);
        } catch (err: any) {
            addLog(`[useAppleIAP] store.order failed: ${err}`);
            toast.error("Impossible d'ouvrir la fenêtre d'achat.");
            setLoading(false);
        }
    }, [loading, addLog]);

    const restorePurchases = useCallback(() => {
        const store = (window as any).CdvPurchase?.store || (window as any).store;
        if (store) {
            addLog("[useAppleIAP] Restauration des achats...");
            store.restorePurchases();
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
