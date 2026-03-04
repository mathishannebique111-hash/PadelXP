"use client";

import Link from "next/link";
import { Trophy, ChevronRight } from "lucide-react";
import { useChallenge } from "@/contexts/ChallengeContext";

export default function ChallengeHighlightBar() {
    const { challenge, loading } = useChallenge();

    if (loading || !challenge) return null;

    // Calcul du pourcentage pour la barre de progression
    const percentage = Math.min(100, Math.round((challenge.progress.current / challenge.progress.target) * 100));

    const isClub = typeof window !== 'undefined' && !!document.documentElement.dataset.clubSubdomain;

    return (
        <Link
            href="/club?tab=challenges"
            className="block w-full mb-4 sm:mb-6 animate-in slide-in-from-top-4 fade-in duration-500 group relative"
        >
            {/* Subtle glow behind the whole component on hover */}
            <div
                className="absolute inset-0 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ backgroundColor: challenge.isPremium ? 'rgba(245, 158, 11, 0.05)' : 'rgba(var(--theme-secondary-accent, 204, 255, 0), 0.05)' }}
            />

            {/* Extremely light and subtle frame */}
            <div
                className="relative z-10 p-2 sm:p-2.5 rounded-xl border transition-all duration-300"
                style={{
                    borderColor: 'rgb(var(--theme-accent, 204, 255, 0))',
                    backgroundColor: isClub ? 'rgb(var(--theme-accent))' : 'rgba(255, 255, 255, 0.02)',
                    backdropFilter: isClub ? 'none' : 'blur(4px)'
                }}
            >
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div
                                className={`flex flex-shrink-0 items-center justify-center w-6 h-6 rounded-full border ${challenge.isPremium ? 'text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : ''}`}
                                style={{
                                    backgroundColor: isClub ? 'var(--theme-page, #071554)' : 'rgba(255, 255, 255, 0.05)',
                                    color: isClub ? 'rgb(var(--theme-accent))' : (challenge.isPremium ? undefined : 'rgb(var(--theme-secondary-accent))'),
                                    borderColor: isClub ? 'var(--theme-page, #071554)' : 'rgb(var(--theme-accent, 204, 255, 0))',
                                    boxShadow: isClub ? 'none' : '0 0 10px rgba(var(--theme-secondary-accent, 204, 255, 0), 0.1)'
                                }}
                            >
                                <Trophy size={11} strokeWidth={2.5} />
                            </div>
                            <span
                                className="text-xs sm:text-sm font-bold truncate transition-colors duration-300"
                                style={{ color: isClub ? 'var(--theme-page, #071554)' : 'rgba(255, 255, 255, 0.9)' }}
                            >
                                {challenge.title}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                                className="text-[10px] sm:text-xs font-black tabular-nums uppercase tracking-wider"
                                style={{ color: isClub ? 'var(--theme-page, #071554)' : 'rgba(255, 255, 255, 0.4)' }}
                            >
                                {challenge.progress.current} / {challenge.progress.target}
                            </span>
                            <ChevronRight size={16} style={{ color: isClub ? 'var(--theme-page, #071554)' : 'rgba(255, 255, 255, 0.2)' }} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>

                    <div
                        className="h-1.5 w-full rounded-full overflow-hidden"
                        style={{
                            backgroundColor: isClub ? 'rgba(var(--theme-page), 0.2)' : 'rgba(0, 0, 0, 0.4)',
                            border: isClub ? '1px solid rgb(var(--theme-accent))' : '1px solid rgba(255, 255, 255, 0.02)'
                        }}
                    >
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out relative ${challenge.isPremium ? 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_12px_rgba(245,158,11,0.8)]' : ''}`}
                            style={{
                                width: `${percentage}%`,
                                ...(!challenge.isPremium ? {
                                    backgroundColor: isClub ? 'rgb(var(--theme-accent))' : 'rgb(var(--theme-secondary-accent))',
                                    boxShadow: isClub ? 'none' : '0 0 12px rgba(var(--theme-secondary-accent, 204, 255, 0), 0.6)'
                                } : {})
                            }}
                        >
                            {/* Inner highlight for 3D effect */}
                            {!isClub && <div className="absolute inset-0 bg-white/10" />}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
