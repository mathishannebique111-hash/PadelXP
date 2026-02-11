"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, Swords, TrendingUp, Users, User, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/components/ui/Toast";
import AddPhoneModal from "@/components/AddPhoneModal";

// Fonction pour calculer le temps restant avant expiration (48h)
const getTimeRemaining = (expiresAt: string, currentTime: Date): { hours: number; minutes: number; expired: boolean } | null => {
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - currentTime.getTime();

    if (diff <= 0) return { hours: 0, minutes: 0, expired: true };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, expired: false };
};

interface SuggestedPair {
    id: string;
    player1: {
        id: string;
        name: string;
        avatar_url: string | null;
    };
    player2: {
        id: string;
        name: string;
        avatar_url: string | null;
    };
    avgLevel: number;
    avgWinrate: number;
    compatibilityScore: number;
}

export default function SuggestedMatches() {
    const router = useRouter();
    const [departmentFilter, setDepartmentFilter] = useState("");

    const fetchSuggestions = useCallback(async (dept: string = "") => {
        try {
            setError(null);
            setLoading(true);

            const url = new URL("/api/matches/suggestions", window.location.origin);
            if (dept) {
                url.searchParams.set("department", dept);
            }

            const response = await fetch(url.toString(), {
                method: "GET",
                credentials: "include",
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setError("Vous devez être connecté");
                    return;
                }
                throw new Error(`Erreur ${response.status}`);
            }

            const data = await response.json();
            setSuggestions(data.suggestions || []);
            setReason(data.reason || null);
        } catch (err) {
            console.error("[SuggestedMatches] Erreur:", err);
            setError("Erreur lors du chargement des suggestions");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSuggestions();
        loadMyPartner();
    }, [fetchSuggestions]);

    // ... (keep existing useEffects and functions)

    // ... (inside return)

    return (
        <>
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
                <div className="mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                            <Swords className="text-blue-400 w-5 h-5" />
                            Matchs suggérés
                        </h3>

                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 sm:w-48">
                                <input
                                    type="text"
                                    placeholder="Dpt (ex: 80)"
                                    value={departmentFilter}
                                    onChange={(e) => setDepartmentFilter(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            fetchSuggestions(departmentFilter);
                                        }
                                    }}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800 transition-all"
                                    maxLength={3}
                                />
                            </div>
                            <button
                                onClick={() => fetchSuggestions(departmentFilter)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-blue-400/20"
                            >
                                Filtrer
                            </button>
                        </div>
                    </div>
                </div>

                {suggestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-800/20 rounded-xl border border-white/5 border-dashed">
                        <Swords className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm text-center px-4">
                            Aucun match trouvé {departmentFilter ? `dans le département ${departmentFilter}` : "correspondant à votre paire"}.
                        </p>
                        {departmentFilter && (
                            <button
                                type="button"
                                onClick={() => { setDepartmentFilter(""); fetchSuggestions(""); }}
                                className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium"
                            >
                                Voir tous les matchs
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {suggestions.map((pair, index) => (
                            <motion.div
                                key={pair.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden relative group"
                            >
                                {/* Header de compatibilité */}
                                <div className="absolute top-3 right-3 z-10">
                                    <div className="bg-emerald-500/20 backdrop-blur-md px-2 py-1 rounded-lg border border-emerald-500/30 flex flex-col items-center">
                                        <span className="text-[10px] text-emerald-400 font-bold leading-none">
                                            {pair.compatibilityScore}%
                                        </span>
                                        <span className="text-[8px] text-emerald-500/70 uppercase font-bold tracking-tighter">compatibilité</span>
                                    </div>
                                </div>

                                <div className="p-4">
                                    {/* Les deux joueurs l'un au dessus de l'autre */}
                                    <div className="flex flex-col gap-3 mb-4">
                                        {[pair.player1, pair.player2].map((player, idx) => (
                                            <div key={player.id} className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3">
                                                    {/* La barre verticale */}
                                                    <div className="w-1 h-8 rounded-full bg-slate-700/50 flex-shrink-0" />

                                                    {/* L'icône ou l'avatar */}
                                                    {player.avatar_url ? (
                                                        <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-white/10 shadow-lg relative aspect-square flex-shrink-0">
                                                            <Image
                                                                src={player.avatar_url}
                                                                alt={player.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-blue-400/60 border border-white/10 shadow-lg flex-shrink-0">
                                                            <User size={16} />
                                                        </div>
                                                    )}

                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-white truncate text-base leading-tight">
                                                            {player.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Stats de la paire */}
                                    <div className="grid grid-cols-2 gap-2 py-3 border-t border-b border-white/5 mb-4">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="flex items-center gap-1 text-gray-400 mb-0.5">
                                                <Users size={12} className="text-blue-400" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">Niveau moyen</span>
                                            </div>
                                            <span className="text-sm font-black text-white">
                                                {pair.avgLevel.toFixed(2)}/10
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center border-l border-white/5">
                                            <div className="flex items-center gap-1 text-gray-400 mb-0.5">
                                                <TrendingUp size={12} className="text-emerald-400" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">Victoires moy.</span>
                                            </div>
                                            <span className="text-sm font-black text-white">
                                                {pair.avgWinrate}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action - Voir la paire / Défier */}
                                    {(() => {
                                        const challengeKey = `${pair.player1.id}-${pair.player2.id}`;
                                        const hasExistingChallenge = existingChallenges.has(challengeKey);

                                        return (
                                            <button
                                                type="button"
                                                onClick={() => handleChallenge({ player1_id: pair.player1.id, player2_id: pair.player2.id })}
                                                disabled={challenging === `${pair.player1.id}-${pair.player2.id}` || !myPartner || hasExistingChallenge}
                                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {hasExistingChallenge ? (
                                                    "DÉFI EN COURS"
                                                ) : challenging === `${pair.player1.id}-${pair.player2.id}` ? (
                                                    <>
                                                        <Loader2 size={14} className="animate-spin" />
                                                        Envoi...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Swords size={14} />
                                                        DÉFIER CETTE PAIRE
                                                    </>
                                                )}
                                            </button>
                                        );
                                    })()}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <AddPhoneModal
                isOpen={showPhoneModal}
                onClose={() => {
                    setShowPhoneModal(false);
                    setPendingChallenge(null);
                }}
                onActivated={handlePhoneModalActivated}
            />
        </>
    );
}
