"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PlayerChallenge {
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

interface ChallengeContextType {
    challenge: PlayerChallenge | null;
    loading: boolean;
    refreshChallenges: () => Promise<void>;
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
    const [challenge, setChallenge] = useState<PlayerChallenge | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchChallenges = useCallback(async () => {
        try {
            const res = await fetch("/api/player/challenges");
            if (!res.ok) throw new Error("Failed to fetch challenges");
            const data = await res.json();

            const challenges: PlayerChallenge[] = data.challenges || [];
            const isPremium = data.isPremiumUser || false;

            // Filtrer les challenges actifs et non réclamés
            const activeChallenges = challenges.filter(
                c => {
                    // Si le challenge est premium et que l'user ne l'est pas, on l'ignore pour la mise en avant
                    if (c.isPremium && !isPremium) return false;

                    return c.status === "active" && !c.rewardClaimed;
                }
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
            console.error("Error fetching challenges in context:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchChallenges();

        const supabase = createClient();
        let activeChannel: any = null;

        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            activeChannel = supabase.channel('challenges-global-context')
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
                .on("broadcast", { event: "challenges_updated" }, () => {
                    fetchChallenges();
                })
                .subscribe();
        };

        setupRealtime();

        const handleRewardClaimed = () => {
            fetchChallenges();
        };
        window.addEventListener('challengeRewardClaimed', handleRewardClaimed);

        return () => {
            if (activeChannel) supabase.removeChannel(activeChannel);
            window.removeEventListener('challengeRewardClaimed', handleRewardClaimed);
        };
    }, [fetchChallenges]);

    return (
        <ChallengeContext.Provider value={{ challenge, loading, refreshChallenges: fetchChallenges }}>
            {children}
        </ChallengeContext.Provider>
    );
}

export function useChallenge() {
    const context = useContext(ChallengeContext);
    if (context === undefined) {
        throw new Error("useChallenge must be used within a ChallengeProvider");
    }
    return context;
}
