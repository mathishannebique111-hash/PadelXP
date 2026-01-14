"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflineScreen() {
    const [isOffline, setIsOffline] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

    useEffect(() => {
        // Vérifier l'état initial
        setIsOffline(!navigator.onLine);

        // Écouter les changements de connexion
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Capacitor Network plugin (si disponible)
        const setupCapacitorNetwork = async () => {
            try {
                const { Network } = await import("@capacitor/network");

                // État initial
                const status = await Network.getStatus();
                setIsOffline(!status.connected);

                // Écouter les changements
                Network.addListener("networkStatusChange", (status) => {
                    setIsOffline(!status.connected);
                });
            } catch (e) {
                // Plugin non disponible (web), on utilise les événements du navigateur
                console.log("[OfflineScreen] Capacitor Network non disponible, utilisation du navigateur");
            }
        };

        setupCapacitorNetwork();

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const handleRetry = async () => {
        setIsRetrying(true);

        try {
            // Essayer de faire une requête pour vérifier la connexion
            const response = await fetch("/api/health", {
                method: "HEAD",
                cache: "no-store"
            });

            if (response.ok) {
                setIsOffline(false);
                // Recharger la page pour récupérer les données
                window.location.reload();
            }
        } catch (e) {
            // Toujours pas de connexion
            console.log("[OfflineScreen] Toujours hors ligne");
        } finally {
            setIsRetrying(false);
        }
    };

    if (!isOffline) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-[#172554] flex flex-col items-center justify-center p-6">
            {/* Fond avec dégradé */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-0" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(0,102,255,0.2),transparent)] z-0" />

            <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
                {/* Icône animée */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
                    <div className="relative w-24 h-24 rounded-full bg-slate-800/80 border-2 border-slate-700 flex items-center justify-center">
                        <WifiOff size={40} className="text-slate-400" />
                    </div>
                </div>

                {/* Titre */}
                <h1 className="text-2xl font-bold text-white mb-3">
                    Pas de connexion
                </h1>

                {/* Description */}
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                    Vérifie ta connexion internet et réessaye.
                    PadelXP a besoin d'une connexion pour fonctionner.
                </p>

                {/* Bouton réessayer */}
                <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-blue-900/30"
                >
                    <RefreshCw
                        size={18}
                        className={isRetrying ? "animate-spin" : ""}
                    />
                    {isRetrying ? "Vérification..." : "Réessayer"}
                </button>

                {/* Indication */}
                <p className="text-gray-500 text-xs mt-6">
                    L'application se reconnectera automatiquement
                </p>
            </div>
        </div>
    );
}
