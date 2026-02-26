"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PlayerChallenge {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    objective: string;
    rewardType: "points" | "badge";
    rewardLabel: string;
    status: "active" | "upcoming" | "completed";
    progress: {
        current: number;
        target: number;
    };
    rewardClaimed: boolean;
    scope: 'global' | 'club';
    isPremium?: boolean;
}

export default function ChallengeHighlightBar() {
    const [challenge, setChallenge] = useState<PlayerChallenge | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchChallenges = async () => {
        try {
            const res = await fetch("/api/player/challenges");
            if (!res.ok) throw new Error("Failed to fetch challenges");
            const data = await res.json();

            const challenges: PlayerChallenge[] = data.challenges || [];

            // Filtrer les challenges actifs et non réclamés
            const activeChallenges = challenges.filter(
                c => c.status === "active" && !c.rewardClaimed
            );

            if (activeChallenges.length === 0) {
                setChallenge(null);
                setLoading(false);
                return;
            }

            // Séparer les challenges commencés et non commencés
            const started = activeChallenges.filter(c => c.progress.current > 0);

            let selectedChallenge: PlayerChallenge | null = null;

            if (started.length > 0) {
                // Prendre celui avec le plus grand pourcentage d'avancement
                selectedChallenge = started.reduce((prev, current) => {
                    const prevPercent = prev.progress.current / prev.progress.target;
                    const currentPercent = current.progress.current / current.progress.target;
                    return currentPercent > prevPercent ? current : prev;
                });
            } else {
                // Prendre celui le plus facile (plus petit target)
                selectedChallenge = activeChallenges.reduce((prev, current) => {
                    return current.progress.target < prev.progress.target ? current : prev;
                });
            }

            setChallenge(selectedChallenge);
        } catch (error) {
            console.error("Error fetching challenges for highlight bar:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChallenges();

        // Mettre en place les écouteurs temps réel
        const supabase = createClient();
        let userId: string | undefined;

        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            userId = user.id;

            const channel = supabase.channel('challenges-highlight-bar')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'player_challenge_progress', filter: `player_id=eq.${user.id}` },
                    () => {
                        fetchChallenges();
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'player_challenge_claims', filter: `player_id=eq.${user.id}` },
                    () => {
                        fetchChallenges();
                    }
                )
                // Écouter les événements API manuels si certains updates ne passent pas par des tables spécifiques
                .on("broadcast", { event: "challenges_updated" }, () => {
                    fetchChallenges();
                })
                .subscribe();

            return channel;
        };

        let activeChannel: any = null;
        setupRealtime().then(ch => { activeChannel = ch; });

        // Écouter l'événement custom pour un rafraîchissement immédiat côté client
        const handleRewardClaimed = () => {
            fetchChallenges();
        };
        window.addEventListener('challengeRewardClaimed', handleRewardClaimed);

        return () => {
            if (activeChannel) supabase.removeChannel(activeChannel);
            window.removeEventListener('challengeRewardClaimed', handleRewardClaimed);
        };
    }, []);

    if (loading || !challenge) return null;

    // Calcul du pourcentage pour la barre de progression
    const percentage = Math.min(100, Math.round((challenge.progress.current / challenge.progress.target) * 100));

    return (
        <Link
            href="/club?tab=challenges"
            className="block w-full mb-4 sm:mb-6 animate-in slide-in-from-top-4 fade-in duration-500 group relative"
        >
            {/* Subtle glow behind the whole component on hover */}
            <div className={`absolute inset-0 ${challenge.isPremium ? 'bg-amber-500/5' : 'bg-padel-green/5'} blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

            {/* Extremely light and subtle frame */}
            <div className="relative z-10 p-2 sm:p-2.5 rounded-xl border border-white/[0.04] bg-white/[0.02] backdrop-blur-sm transition-all duration-300 group-hover:bg-white/[0.04] group-hover:border-white/[0.08]">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`flex flex-shrink-0 items-center justify-center w-6 h-6 rounded-full bg-white/5 border border-white/10 ${challenge.isPremium ? 'text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'text-padel-green shadow-[0_0_10px_rgba(204,255,0,0.1)]'}`}>
                                <Trophy size={11} strokeWidth={2.5} />
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-white/90 truncate group-hover:text-white transition-colors duration-300">
                                {challenge.title}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex flex-col items-end">
                                <span className={`text-[11px] font-bold tabular-nums leading-none ${challenge.isPremium ? 'text-amber-400' : 'text-padel-green'}`}>
                                    {percentage}%
                                </span>
                                <span className="text-[9px] text-white/40 font-medium uppercase tracking-wider mt-0.5">
                                    {challenge.progress.current} / {challenge.progress.target}
                                </span>
                            </div>
                            <ChevronRight size={16} className="text-white/20 group-hover:text-white/70 transition-colors duration-300" />
                        </div>
                    </div>

                    {/* Thinner, elegant progress bar track using padel-green for consistency */}
                    <div className="h-1 w-full rounded-full bg-black/40 border border-white/[0.02] overflow-hidden">
                        <div
                            className={`h-full rounded-full ${challenge.isPremium ? 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_12px_rgba(245,158,11,0.8)]' : 'bg-padel-green shadow-[0_0_12px_rgba(204,255,0,0.6)]'} transition-all duration-1000 ease-out relative`}
                            style={{ width: `${percentage}%` }}
                        >
                            {/* Inner highlight for 3D effect */}
                            <div className="absolute inset-0 bg-white/10" />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
