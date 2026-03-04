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
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6" style={{ backgroundColor: 'rgb(var(--theme-page, 23 37 84))' }}>
            {/* Fond avec dégradé */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-0" />
            <div className="absolute inset-0 z-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(var(--theme-accent, 0, 102, 255), 0.2), transparent)' }} />

            <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
                {/* Icône animée */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 rounded-full blur-2xl animate-pulse" style={{ backgroundColor: 'rgb(var(--theme-accent, 59, 130, 246), 0.2)' }} />
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
                    className="flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg"
                    style={{ backgroundColor: 'rgb(var(--theme-accent, 37, 99, 235))', boxShadow: '0 10px 15px -3px rgba(var(--theme-accent), 0.3)' }}
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
