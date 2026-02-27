"use client";

import Link from "next/link";
import { Trophy, ChevronRight } from "lucide-react";
import { useChallenge } from "@/contexts/ChallengeContext";

export default function ChallengeHighlightBar() {
    const { challenge, loading } = useChallenge();

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
                            <span className="text-[10px] sm:text-xs text-white/40 font-bold tabular-nums uppercase tracking-wider">
                                {challenge.progress.current} / {challenge.progress.target}
                            </span>
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
