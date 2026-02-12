"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";

export default function PremiumBadgeOverlay({ isObtained }: { isObtained: boolean }) {
    const [claiming, setClaiming] = useState(false);
    const router = useRouter();

    const handleUpgrade = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (claiming) return;

        try {
            setClaiming(true);
            const res = await fetch("/api/player/upgrade", { method: "POST" });
            if (res.ok) {
                // Refresh the route to update server components with new data
                router.refresh();
            } else {
                logger.error("[PremiumBadgeOverlay] Upgrade failed");
            }
        } catch (err) {
            logger.error("[PremiumBadgeOverlay] Upgrade error", err);
        } finally {
            setClaiming(false);
        }
    };

    return (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[4px] text-center p-2">
            <div className="mb-2 p-1.5 rounded-full bg-amber-500/20 border border-amber-500/40">
                <Lock className="w-5 h-5 text-amber-400" />
            </div>
            {isObtained && (
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide bg-black/60 px-2 py-1 rounded mb-1">
                    Débloqué
                </span>
            )}
            <button
                onClick={handleUpgrade}
                disabled={claiming}
                className="mt-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-3 py-1.5 text-[10px] font-bold text-black shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
                {claiming ? (
                    <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Activation...</span>
                    </>
                ) : (
                    <span>Devenir Premium</span>
                )}
            </button>
        </div>
    );
}
