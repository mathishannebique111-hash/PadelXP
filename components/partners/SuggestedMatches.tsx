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
    const supabase = createClient();
    const [suggestions, setSuggestions] = useState<SuggestedPair[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reason, setReason] = useState<string | null>(null);
    const [departmentFilter, setDepartmentFilter] = useState("");

    // Missing state from original crash
    const [myPartner, setMyPartner] = useState<{ id: string; name: string } | null>(null);
    const [existingChallenges, setExistingChallenges] = useState<Set<string>>(new Set());
    const [challenging, setChallenging] = useState<string | null>(null);
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [pendingChallenge, setPendingChallenge] = useState<{ player1_id: string; player2_id: string } | null>(null);

    const loadMyPartner = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: partnership } = await supabase
                .from("player_partnerships")
                .select("player_id, partner_id, player:player_id(first_name, last_name, display_name), partner:partner_id(first_name, last_name, display_name)")
                .eq("status", "accepted")
                .or(`player_id.eq.${user.id},partner_id.eq.${user.id}`)
                .maybeSingle();

            if (partnership) {
                const isPlayer1 = partnership.player_id === user.id;
                const partnerId = isPlayer1 ? partnership.partner_id : partnership.player_id;
                const partnerData = isPlayer1 ? (partnership.partner as any) : (partnership.player as any);

                const name = partnerData.first_name && partnerData.last_name
                    ? `${partnerData.first_name} ${partnerData.last_name}`.trim()
                    : partnerData.display_name || "Partenaire";

                setMyPartner({ id: partnerId, name });
            }
        } catch (error) {
            console.error("[SuggestedMatches] Erreur chargement partenaire", error);
        }
    }, [supabase]);

    const loadExistingChallenges = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Charger les défis actifs (envoyés)
            const { data: challenges } = await supabase
                .from("team_challenges")
                .select("defender_player_1_id, defender_player_2_id")
                .or(`challenger_player_1_id.eq.${user.id},challenger_player_2_id.eq.${user.id}`)
                .in("status", ["pending", "accepted"])
                .gt("expires_at", new Date().toISOString());

            if (challenges) {
                const challengeSet = new Set<string>();
                challenges.forEach((c: { defender_player_1_id: string; defender_player_2_id: string }) => {
                    // Créer une clé unique pour la paire adverse (triée pour cohérence)
                    const ids = [c.defender_player_1_id, c.defender_player_2_id].sort();
                    // On ne peut pas facilement matcher exactement les paires suggérées car l'ordre n'est pas garanti
                    // Mais on peut essayer de reconstruire la clé utilisée dans le rendu
                    // Dans le rendu : challengeKey = `${pair.player1.id}-${pair.player2.id}`
                    // Ici on va stocker les deux sens pour être sûr
                    challengeSet.add(`${c.defender_player_1_id}-${c.defender_player_2_id}`);
                    challengeSet.add(`${c.defender_player_2_id}-${c.defender_player_1_id}`);
                });
                setExistingChallenges(challengeSet);
            }
        } catch (error) {
            console.error("[SuggestedMatches] Erreur chargement défis", error);
        }
    }, [supabase]);

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
        loadExistingChallenges();
    }, [fetchSuggestions, loadMyPartner, loadExistingChallenges]);

    const createChallenge = async (opp1Id: string, opp2Id: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !myPartner) return;

            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 48); // 48h expiration

            const { error } = await supabase.from("team_challenges").insert({
                challenger_player_1_id: user.id,
                challenger_player_2_id: myPartner.id,
                defender_player_1_id: opp1Id,
                defender_player_2_id: opp2Id,
                status: "pending",
                defender_1_status: "pending",
                defender_2_status: "pending",
                expires_at: expiresAt.toISOString()
            });

            if (error) throw error;

            showToast("Défi envoyé ! ⚔️", "success");

            // Mise à jour locale
            setExistingChallenges(prev => {
                const next = new Set(prev);
                next.add(`${opp1Id}-${opp2Id}`);
                next.add(`${opp2Id}-${opp1Id}`);
                return next;
            });

            // Déclencher événement global
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("teamChallengeCreated"));
            }

        } catch (error) {
            console.error("[SuggestedMatches] Erreur création défi", error);
            showToast("Erreur lors de l'envoi du défi", "error");
        }
    };

    const handleChallenge = async (pair: { player1_id: string, player2_id: string }) => {
        try {
            const challengeKey = `${pair.player1_id}-${pair.player2_id}`;
            setChallenging(challengeKey);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Vérifier téléphone
            const { data: profile } = await supabase
                .from("profiles")
                .select("phone_number")
                .eq("id", user.id)
                .maybeSingle();

            if (!profile?.phone_number) {
                setPendingChallenge(pair);
                setShowPhoneModal(true);
                return;
            }

            await createChallenge(pair.player1_id, pair.player2_id);

        } catch (error) {
            console.error("[SuggestedMatches] Erreur handleChallenge", error);
        } finally {
            setChallenging(null);
        }
    };

    const handlePhoneModalActivated = async () => {
        if (pendingChallenge) {
            // Un petit délai pour laisser le temps au state de se mettre à jour si nécessaire
            setChallenging(`${pendingChallenge.player1_id}-${pendingChallenge.player2_id}`);
            try {
                await createChallenge(pendingChallenge.player1_id, pendingChallenge.player2_id);
            } finally {
                setChallenging(null);
                setPendingChallenge(null);
                setShowPhoneModal(false);
            }
        }
    };

    if (loading) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/20">
                <div className="mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="h-7 w-40 bg-slate-800 rounded-lg animate-pulse" />
                        <div className="flex items-center gap-2">
                            <div className="h-9 w-full sm:w-48 bg-slate-800 rounded-lg animate-pulse" />
                            <div className="h-9 w-20 bg-slate-800 rounded-lg animate-pulse" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="bg-slate-800/40 rounded-2xl border border-white/5 h-[300px] animate-pulse relative overflow-hidden">
                            <div className="absolute top-3 right-3 w-16 h-8 bg-slate-700/50 rounded-lg" />
                            <div className="p-4 flex flex-col gap-4 h-full">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-8 rounded-full bg-slate-700/50" />
                                        <div className="w-8 h-8 rounded-full bg-slate-700/50" />
                                        <div className="h-6 w-32 bg-slate-700/50 rounded" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-1 h-8 rounded-full bg-slate-700/50" />
                                        <div className="w-8 h-8 rounded-full bg-slate-700/50" />
                                        <div className="h-6 w-32 bg-slate-700/50 rounded" />
                                    </div>
                                </div>
                                <div className="mt-auto h-12 w-full bg-slate-700/50 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

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
                                        const hasExistingChallenge = existingChallenges.has(challengeKey) || existingChallenges.has(`${pair.player2.id}-${pair.player1.id}`);

                                        return (
                                            <button
                                                type="button"
                                                onClick={() => handleChallenge({ player1_id: pair.player1.id, player2_id: pair.player2.id })}
                                                disabled={challenging === challengeKey || !myPartner || hasExistingChallenge}
                                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {hasExistingChallenge ? (
                                                    "DÉFI EN COURS"
                                                ) : challenging === challengeKey ? (
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
