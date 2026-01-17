"use client";

import { useState, useEffect } from "react";
import PendingMatchCard from "./PendingMatchCard";

interface PendingMatch {
    id: string;
    winner_team_id: string;
    team1_id: string;
    team2_id: string;
    score_team1: number;
    score_team2: number;
    created_at: string;
    participants: any[];
    creator_name: string;
    creator_id: string;
    current_user_confirmed: boolean;
    confirmation_count: number;
    confirmations_needed: number;
}

interface PendingMatchesSectionProps {
    onPendingCountChange?: (count: number) => void;
}

export default function PendingMatchesSection({ onPendingCountChange }: PendingMatchesSectionProps) {
    const [pendingMatches, setPendingMatches] = useState<PendingMatch[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPendingMatches = async () => {
        try {
            const res = await fetch("/api/matches/pending", {
                credentials: "include",
            });

            if (res.ok) {
                const data = await res.json();
                setPendingMatches(data.pendingMatches || []);
                if (onPendingCountChange) {
                    onPendingCountChange(data.pendingMatches?.length || 0);
                }
            }
        } catch (error) {
            console.error("Error fetching pending matches:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingMatches();
    }, []);

    const handleMatchConfirmed = () => {
        // Recharger les matchs en attente
        fetchPendingMatches();
    };

    if (loading) {
        return (
            <div className="mb-6 animate-pulse">
                <div className="h-8 w-48 bg-white/10 rounded mb-4"></div>
                <div className="h-48 bg-white/10 rounded-2xl"></div>
            </div>
        );
    }

    if (pendingMatches.length === 0) {
        return null;
    }

    return (
        <div className="mb-6">
            <div className="mb-4 flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">
                    Matchs en attente de confirmation
                </h3>
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                    {pendingMatches.length}
                </span>
            </div>

            <div className="space-y-4">
                {pendingMatches.map((match) => (
                    <PendingMatchCard
                        key={match.id}
                        match={match}
                        onConfirmed={handleMatchConfirmed}
                    />
                ))}
            </div>
        </div>
    );
}

