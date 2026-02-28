"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Swords,
    Crown,
    Sparkles,
    ArrowRight,
    Loader2,
    User as UserIcon,
    TrendingUp,
    Target,
    Clock,
    Calendar,
    AlertCircle,
    Shuffle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getOraclePrediction } from "@/app/actions/oracle";
import PlayerSlotSquare from "./PlayerSlotSquare";
import PlayerAutocomplete from "./PlayerAutocomplete";
import type { PlayerSearchResult } from "@/lib/utils/player-utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export interface PlayerInsight {
    userId: string;
    displayName: string;
    luckyDay: string | null;
    goldenHour: string | null;
    strengths: string[];
    weaknesses: string[];
    form: number;
}

export interface RankProgression {
    scope: "National" | "Régional" | "Départemental" | "Club";
    currentRank: number;
    newRankWin: number;
    newRankLoss: number;
    totalPlayers: number;
}

export interface OraclePredictionResult {
    team1: {
        players: any[];
        winProbability: number;
        avgLevel: number;
        synergy: { score: number; reason: string };
    };
    team2: {
        players: any[];
        winProbability: number;
        avgLevel: number;
        synergy: { score: number; reason: string };
    };
    playerStakes: {
        [userId: string]: {
            currentLevel: number;
            ifWin: { delta: number; newLevel: number; pointsDelta: number; ranks: RankProgression[] };
            ifLoss: { delta: number; newLevel: number; pointsDelta: number; ranks: RankProgression[] };
        };
    };
    playerInsights: PlayerInsight[];
    suggestedBalancedTeams?: string[];
    tacticalTarget?: {
        team1Target: { userId: string; reason: string } | null;
        team2Target: { userId: string; reason: string } | null;
    };
}

export default function OracleTab({ selfId }: { selfId: string }) {
    const [isPremium, setIsPremium] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [simulating, setSimulating] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);

    const LOADING_MESSAGES = [
        "Calcul des probabilités ELO...",
        "Scan de l'historique des joueurs...",
        "Interrogation de l'Oracle en cours...",
        "Le Coach IA prépare ses conseils..."
    ];

    useEffect(() => {
        let interval: any;
        if (simulating) {
            setLoadingStep(0);
            interval = setInterval(() => {
                setLoadingStep(prev => (prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev));
            }, 1100);
        } else {
            setLoadingStep(0);
        }
        return () => clearInterval(interval);
    }, [simulating]);
    const [result, setResult] = useState<OraclePredictionResult | null>(null);
    const [selfProfile, setSelfProfile] = useState<PlayerSearchResult | null>(null);
    const [activeInsightTab, setActiveInsightTab] = useState<string>(selfId);

    const [selectedPlayers, setSelectedPlayers] = useState<{
        partner: PlayerSearchResult | null;
        opp1: PlayerSearchResult | null;
        opp2: PlayerSearchResult | null;
    }>({
        partner: null,
        opp1: null,
        opp2: null,
    });

    const [activeSlot, setActiveSlot] = useState<'partner' | 'opp1' | 'opp2' | null>(null);
    const [isSearchModalOpen, setIsSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const playerIds = [selfId, selectedPlayers.partner?.id, selectedPlayers.opp1?.id, selectedPlayers.opp2?.id].filter(Boolean) as string[];

    const handleRebalance = () => {
        if (!result?.suggestedBalancedTeams) return;

        const allP = [selfProfile, selectedPlayers.partner, selectedPlayers.opp1, selectedPlayers.opp2];
        const findP = (id: string) => allP.find(p => p?.id === id) || null;

        const newP = {
            partner: findP(result.suggestedBalancedTeams[1]),
            opp1: findP(result.suggestedBalancedTeams[2]),
            opp2: findP(result.suggestedBalancedTeams[3])
        };

        setSelectedPlayers(newP);
        setResult(null);
        toast.success("Équipes rééquilibrées ! L'Oracle va relancer l'analyse.");
    };

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        checkPremiumAndFetchSelf();
    }, []);

    useEffect(() => {
        if (result && !activeInsightTab) {
            setActiveInsightTab(selfId);
        }
    }, [result, selfId, activeInsightTab]);

    async function checkPremiumAndFetchSelf() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from("profiles")
                .select("is_premium, first_name, last_name, display_name, avatar_url, niveau_padel")
                .eq("id", user.id)
                .single();

            setIsPremium(profile?.is_premium || false);

            const first_name = profile?.first_name || profile?.display_name?.split(' ')[0] || '';
            const last_name = profile?.last_name || profile?.display_name?.split(' ').slice(1).join(' ') || '';

            setSelfProfile({
                id: user.id,
                first_name,
                last_name,
                display_name: profile?.display_name || `${first_name} ${last_name}`.trim(),
                avatar_url: profile?.avatar_url || null,
                type: 'user',
                niveau_padel: profile?.niveau_padel,
            });

        } catch (error) {
            console.error("Error checking premium:", error);
        } finally {
            setLoading(false);
        }
    }

    const handleRunSimulation = async () => {
        if (!selectedPlayers.partner || !selectedPlayers.opp1 || !selectedPlayers.opp2) {
            toast.error("Veuillez sélectionner les 4 joueurs");
            return;
        }

        setSimulating(true);
        setResult(null);

        const playerIds = [
            selfId,
            selectedPlayers.partner.id,
            selectedPlayers.opp1.id,
            selectedPlayers.opp2.id
        ];

        const prediction = await getOraclePrediction(playerIds);

        if ('error' in prediction) {
            toast.error(prediction.error);
        } else {
            setResult(prediction as any);
            setActiveInsightTab(selfId);
        }
        setSimulating(false);
    };

    const handleUpgrade = () => {
        router.push(`/premium?returnPath=${window.location.pathname}?tab=oracle`);
    };

    const openSearch = (slot: 'partner' | 'opp1' | 'opp2') => {
        setActiveSlot(slot);
        setSearchQuery("");
        setIsSearchModal(true);
    };

    const handleSelectPlayer = (player: PlayerSearchResult | null) => {
        if (!activeSlot || !player) return;

        // Check for duplicates
        const allIds = [selfId, selectedPlayers.partner?.id, selectedPlayers.opp1?.id, selectedPlayers.opp2?.id].filter(Boolean);
        if (allIds.includes(player.id)) {
            toast.error("Ce joueur est déjà dans le match");
            return;
        }

        setSelectedPlayers(prev => ({ ...prev, [activeSlot]: player }));
        setIsSearchModal(false);
        setActiveSlot(null);
        setSearchQuery("");
        setResult(null); // Reset result if players change
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/50" /></div>;

    if (isPremium === false) {
        return (
            <div className="relative overflow-hidden rounded-3xl bg-[#071554]/40 border border-white/10 p-8 sm:p-12 text-center shadow-2xl backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mb-6 shadow-glow-yellow">
                        <Crown className="w-10 h-10 text-yellow-500 fill-yellow-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">Système Oracle</h2>
                    <p className="text-lg text-white/70 mb-8 max-w-md mx-auto leading-relaxed font-medium">
                        Devenez le maître du terrain. Simulez vos matchs, analysez vos chances de victoire et recevez des conseils tactiques personnalisés avant même d'entrer sur le court.
                    </p>
                    <button
                        onClick={handleUpgrade}
                        className="group px-10 py-5 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-600 text-[#071554] text-xl font-black shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:shadow-[0_0_60px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-wider"
                    >
                        <Sparkles className="w-6 h-6" />
                        Devenir premium
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <p className="text-xs text-white/30 mt-6 font-bold uppercase tracking-widest">Exclusivité Premium PadelXP</p>
                </div>
            </div>
        );
    }

    const currentInsight = result?.playerInsights.find(i => i.userId === activeInsightTab);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <motion.div
                layout
                className={`bg-[#071554]/40 border border-white/10 rounded-3xl relative overflow-hidden backdrop-blur-xl transition-colors duration-700 ${simulating ? 'p-12 min-h-[400px] flex items-center justify-center' : 'p-6 sm:p-8 min-h-0'}`}
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-padel-green/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
                    <AnimatePresence mode="wait">
                        {simulating ? (
                            <motion.div
                                key="loading-header"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                className="w-full flex flex-col items-center text-center space-y-8"
                            >
                                <motion.div
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-24 h-24 rounded-3xl bg-padel-green/10 border border-padel-green/20 flex items-center justify-center shadow-[0_0_50px_rgba(204,255,0,0.1)]"
                                >
                                    <Sparkles className="w-12 h-12 text-padel-green" />
                                </motion.div>

                                <div className="space-y-6 w-full max-w-xs relative z-10">
                                    <div className="h-7 items-center justify-center flex relative">
                                        <AnimatePresence mode="wait">
                                            <motion.p
                                                key={loadingStep}
                                                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                                exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                                                transition={{
                                                    duration: 0.6,
                                                    ease: [0.22, 1, 0.36, 1]
                                                }}
                                                className="text-sm font-black text-white uppercase tracking-wider text-center w-full"
                                            >
                                                {LOADING_MESSAGES[loadingStep]}
                                            </motion.p>
                                        </AnimatePresence>
                                    </div>

                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                        <motion.div
                                            className="h-full bg-padel-green shadow-[0_0_15px_rgba(204,255,0,0.5)]"
                                            initial={{ width: "0%" }}
                                            animate={{ width: `${((loadingStep + 1) / LOADING_MESSAGES.length) * 100}%` }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>

                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Chargement Oracle v2.5</p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="normal-header"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-padel-green/20 rounded-xl border border-padel-green/30">
                                            <Swords className="w-6 h-6 text-padel-green" />
                                        </div>
                                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Simulateur Oracle</h1>
                                    </div>
                                    <p className="text-white/60 text-sm max-w-lg leading-relaxed">
                                        Analysez la synergie de votre équipe et découvrez vos chances de victoire en fonction de la data réelle de vos adversaires.
                                    </p>
                                </div>

                                {!result ? (
                                    <button
                                        onClick={handleRunSimulation}
                                        disabled={simulating || !selectedPlayers.partner || !selectedPlayers.opp1 || !selectedPlayers.opp2}
                                        className="h-14 px-8 rounded-2xl bg-padel-green text-[#071554] font-black text-lg shadow-[0_0_30px_rgba(204,255,0,0.2)] hover:shadow-[0_0_40px_rgba(204,255,0,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-2 uppercase tracking-tight"
                                    >
                                        <Sparkles className="w-5 h-5" />
                                        Lancer l'Oracle
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setResult(null)}
                                        className="h-14 px-8 rounded-2xl bg-white/10 text-white font-bold text-sm border border-white/10 hover:bg-white/20 transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                                    >
                                        Nouvelle Simulation
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Selection Area */}
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Team 1 */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 py-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Équipe 1</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <PlayerSlotSquare
                                    player={selfProfile}
                                    label="Moi"
                                    isOwner={true}
                                />
                                <PlayerSlotSquare
                                    player={selectedPlayers.partner}
                                    label="Partenaire"
                                    onClick={() => openSearch('partner')}
                                    onRemove={() => setSelectedPlayers(p => ({ ...p, partner: null }))}
                                />
                            </div>
                            {result && (
                                <div className="px-1 border-l border-blue-500/30 ml-1">
                                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Synergie: {result.team1.synergy.score}%</div>
                                    <div className="text-[9px] text-white/40 leading-tight">{result.team1.synergy.reason}</div>
                                </div>
                            )}
                        </div>

                        {/* Team 2 */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 py-2">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Équipe 2</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <PlayerSlotSquare
                                    player={selectedPlayers.opp1}
                                    label="Opposant 1"
                                    onClick={() => openSearch('opp1')}
                                    onRemove={() => setSelectedPlayers(p => ({ ...p, opp1: null }))}
                                />
                                <PlayerSlotSquare
                                    player={selectedPlayers.opp2}
                                    label="Opposant 2"
                                    onClick={() => openSearch('opp2')}
                                    onRemove={() => setSelectedPlayers(p => ({ ...p, opp2: null }))}
                                />
                            </div>
                            {result && (
                                <div className="px-1 border-l border-red-500/30 ml-1">
                                    <div className="text-[10px] font-black text-red-400 uppercase tracking-wider">Synergie: {result.team2.synergy.score}%</div>
                                    <div className="text-[9px] text-white/40 leading-tight">{result.team2.synergy.reason}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Player Selection Modal (if needed, but usually search input is enough) */}
                    {isSearchModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="w-full max-w-md bg-[#172554] border border-white/20 rounded-3xl shadow-2xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Recherche un joueur</h3>
                                    <button onClick={() => setIsSearchModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                        <AlertCircle className="w-5 h-5 text-white/50" />
                                    </button>
                                </div>
                                <PlayerAutocomplete
                                    value={searchQuery}
                                    onChange={setSearchQuery}
                                    onSelect={handleSelectPlayer}
                                />
                                <button
                                    onClick={() => setIsSearchModal(false)}
                                    className="w-full mt-4 py-3 text-white/40 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Prediction Display Area */}
                <div className="min-h-[400px]">
                    {!result ? (
                        <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-white/5 p-12 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 opacity-30">
                                <Target className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white/40 uppercase tracking-tight mb-2">En attente de données</h3>
                            <p className="text-white/20 text-sm max-w-[240px]">Sélectionnez les 4 participants pour que l'Oracle puisse analyser la rencontre.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in zoom-in-95 fade-in duration-500">
                            {/* Battle Bar */}
                            <div className="bg-[#071554]/60 border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                                <div className="relative z-10">
                                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 text-center">Pourcentage de victoire pour chaque équipe</div>
                                    <div className="flex justify-between items-end mb-4">
                                        <div className="text-left">
                                            <div className="text-5xl font-black text-padel-green tracking-tighter">{result.team1.winProbability}%</div>
                                            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Équipe 1</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-5xl font-black text-red-500 tracking-tighter">{result.team2.winProbability}%</div>
                                            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Équipe 2</div>
                                        </div>
                                    </div>

                                    <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden flex border border-white/5 p-0.5">
                                        <div
                                            className="h-full bg-gradient-to-r from-padel-green/80 to-padel-green rounded-l-full transition-all duration-1000 ease-out"
                                            style={{ width: `${result.team1.winProbability}%` }}
                                        />
                                        <div
                                            className="h-full bg-gradient-to-l from-red-600 to-red-400 rounded-r-full transition-all duration-1000 ease-out"
                                            style={{ width: `${result.team2.winProbability}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Magic Balance (Proposed just below win percentage frame) */}
                            {result.suggestedBalancedTeams && result.suggestedBalancedTeams.some((id, i) => id !== [selfId, selectedPlayers.partner?.id, selectedPlayers.opp1?.id, selectedPlayers.opp2?.id][i]) && (
                                <div className="bg-[#CCFF00] p-6 rounded-3xl shadow-[0_0_30px_rgba(204,255,0,0.1)] border border-[#CCFF00]/20 flex items-center justify-between group animate-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-[#071554]/10 flex items-center justify-center animate-pulse">
                                            <Shuffle className="w-6 h-6 text-[#071554]" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-[#071554] uppercase tracking-wider">Équilibrer le match ?</h3>
                                            <p className="text-[11px] text-[#071554]/60 font-medium max-w-[200px]">L'Oracle a trouvé une configuration plus compétitive.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleRebalance}
                                        className="px-6 py-3 bg-[#071554] text-white rounded-xl text-[10px] font-black uppercase hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#071554]/20"
                                    >
                                        Mixer les joueurs
                                    </button>
                                </div>
                            )}

                            {/* Tactical Plan removed from here, now in Coach IA */}

                            {/* Progress Stakes (My stakes) */}
                            <div className="bg-[#CCFF00] p-6 rounded-3xl shadow-[0_0_30px_rgba(204,255,0,0.1)] border border-[#CCFF00]/20">
                                <div className="flex items-center gap-3 mb-4">
                                    <TrendingUp className="w-5 h-5 text-[#071554]" />
                                    <h3 className="text-sm font-black text-[#071554] uppercase tracking-wider">Enjeux personnels</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    {/* Si défaite */}
                                    <div className="bg-white/20 rounded-2xl p-4 border border-white/20 flex flex-col justify-between">
                                        <div>
                                            <div className="text-[9px] font-bold text-[#071554]/60 uppercase tracking-widest mb-1">Si défaite</div>
                                            <div className="text-xl font-black text-[#071554]">{result.playerStakes[selfId].ifLoss.delta.toFixed(2)}</div>
                                        </div>
                                        <div className="mt-4 flex items-center gap-2 bg-[#071554]/5 p-2 rounded-lg border border-[#071554]/10">
                                            <span className="text-[10px] font-bold text-[#071554]/60">{result.playerStakes[selfId].currentLevel}</span>
                                            <ArrowRight size={10} className="text-[#071554]/30" />
                                            <span className="text-[10px] font-black text-[#071554]">{result.playerStakes[selfId].ifLoss.newLevel.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Si victoire */}
                                    <div className="bg-[#071554] rounded-2xl p-4 shadow-xl flex flex-col justify-between">
                                        <div>
                                            <div className="text-[9px] font-bold text-padel-green uppercase tracking-widest mb-1">Si victoire</div>
                                            <div className="text-xl font-black text-white">+{result.playerStakes[selfId].ifWin.delta.toFixed(2)}</div>
                                        </div>
                                        <div className="mt-4 flex items-center gap-2 bg-white/10 p-2 rounded-lg border border-white/10">
                                            <span className="text-[10px] font-bold text-white/40">{result.playerStakes[selfId].currentLevel}</span>
                                            <ArrowRight size={10} className="text-padel-green" />
                                            <span className="text-[10px] font-black text-white">{result.playerStakes[selfId].ifWin.newLevel.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="text-[10px] font-black text-[#071554]/60 uppercase tracking-widest mb-2 px-1">Nouveau rang au classement</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {result.playerStakes[selfId].ifWin.ranks.map((rank) => (
                                            <div key={rank.scope} className="bg-white/10 rounded-xl p-3 flex items-center justify-between border border-white/5">
                                                <span className="text-[10px] font-bold text-[#071554]">{rank.scope}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-black text-[#071554]/40 text-right">#{rank.currentRank}</span>
                                                    <ArrowRight size={10} className="text-[#071554]/30" />
                                                    <span className="text-[11px] font-black text-[#071554] text-right">#{rank.newRankWin}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Tactical Advice & Insights */}
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                                <div className="flex items-center gap-3 mb-6">
                                    <Sparkles className="w-5 h-5 text-padel-green" />
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Analyse du Coach IA</h3>
                                </div>

                                {/* Tactical Advice Integration */}
                                {result.tacticalTarget && (
                                    <div className="mb-8 p-5 rounded-2xl bg-padel-green/5 border border-padel-green/20 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <Target className="w-12 h-12 text-padel-green" />
                                        </div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-1.5 bg-padel-green/20 rounded-lg">
                                                <Target className="w-4 h-4 text-padel-green" />
                                            </div>
                                            <h4 className="text-[11px] font-black text-padel-green uppercase tracking-widest">Plan d'Attaque Prioritaire</h4>
                                        </div>
                                        <p className="text-sm text-white/90 leading-relaxed font-black uppercase tracking-tight italic">
                                            "{result.tacticalTarget.team1Target?.reason}"
                                        </p>
                                    </div>
                                )}

                                {/* Player Tabs */}
                                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                                    {[selfProfile, selectedPlayers.partner, selectedPlayers.opp1, selectedPlayers.opp2].map((p, idx) => p && (
                                        <button
                                            key={p.id}
                                            onClick={() => setActiveInsightTab(p.id)}
                                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${activeInsightTab === p.id
                                                ? 'bg-padel-green text-[#071554] border-padel-green shadow-lg shadow-padel-green/20'
                                                : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            {idx === 0 ? "Moi" : p.first_name || p.display_name.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>

                                {currentInsight ? (
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                        {/* Status Pills */}
                                        <div className="flex flex-wrap gap-2">
                                            <div className="px-3 py-1.5 rounded-full bg-padel-green/10 border border-padel-green/30 text-padel-green text-[9px] font-black uppercase flex items-center gap-1.5">
                                                <Calendar size={10} /> {currentInsight.luckyDay ? `Jour de gloire : ${currentInsight.luckyDay}` : "Données jour insuffisantes"}
                                            </div>
                                            <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase flex items-center gap-1.5">
                                                <Clock size={10} /> {currentInsight.goldenHour ? `Heure de gloire : ${currentInsight.goldenHour}` : "Données heure insuffisantes"}
                                            </div>
                                            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-[9px] font-black uppercase flex items-center gap-1.5" title="Basé sur les 5 derniers matchs">
                                                <TrendingUp size={10} /> Forme : {currentInsight.form}% (% victoires 5 derniers matchs)
                                            </div>
                                        </div>

                                        {/* Strengths & Weaknesses */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">Points Forts</div>
                                                {currentInsight.strengths.length > 0 ? currentInsight.strengths.map((s, idx) => (
                                                    <div key={idx} className="flex gap-2 text-[11px] text-white/80 items-start leading-tight bg-padel-green/5 p-2 rounded-lg border border-padel-green/10">
                                                        <Sparkles size={10} className="text-padel-green mt-0.5 flex-shrink-0" />
                                                        {s}
                                                    </div>
                                                )) : <div className="text-[10px] text-white/30 italic px-1">Aucune force majeure détectée</div>}
                                            </div>
                                            <div className="space-y-3">
                                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">Points Faibles</div>
                                                {currentInsight.weaknesses.length > 0 ? currentInsight.weaknesses.map((w, idx) => (
                                                    <div key={idx} className="flex gap-2 text-[11px] text-white/80 items-start leading-tight bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                                                        <AlertCircle size={10} className="text-red-400 mt-0.5 flex-shrink-0" />
                                                        {w}
                                                    </div>
                                                )) : <div className="text-[10px] text-white/30 italic px-1">Aucun point faible notable</div>}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-white/20 text-xs italic">Sélectionnez un joueur pour voir l'analyse</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
