"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Check, Share2, Trophy, Award, Crown, MessageSquare, Lock, Loader2, Sparkles, ArrowRight } from "lucide-react";
import PageTitle from "@/components/PageTitle";
import BadgeIconDisplay from "@/components/BadgeIconDisplay";
import BadgeUnlockedNotifier from "@/components/BadgeUnlockedNotifier";
import { Badge } from "@/lib/badges";


interface ExtendedBadge extends Badge {
    obtained: boolean;
}

interface ChallengeBadge {
    id: string;
    badge_name: string;
    badge_emoji: string;
    earned_at: string;
}

interface BadgesViewProps {
    badgesWithStatus: ExtendedBadge[];
    challengeBadges: ChallengeBadge[];
    isPremiumUser: boolean;
    counts: {
        total: number;
        obtained: number;
        challenge: number;
        premium: number;
    };
}

export default function BadgesView({
    badgesWithStatus,
    challengeBadges,
    isPremiumUser,
    counts,
}: BadgesViewProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"standard" | "challenges">("standard");
    // Local state for optimistic update
    const [isPremium, setIsPremium] = useState(isPremiumUser);

    useEffect(() => {
        if (isPremiumUser) {
            setIsPremium(true);
        }
    }, [isPremiumUser]);

    const handlePremiumUnlocked = () => {
        setIsPremium(true);
        router.refresh();
    };

    // Filter logic: Standard now includes all badges that are not from challenges
    // Note: In this context, badgesWithStatus contains everything except challengeBadges which are handled separately
    const allStandardBadges = badgesWithStatus;

    // Prepare notifier data
    const badgesForNotifier = badgesWithStatus
        .filter(b => b.obtained)
        .map((badge, index) => ({
            id: `${badge.title}-${index}`,
            name: badge.title,
            description: badge.description,
            icon: badge.icon,
        }));

    return (
        <>
            <BadgeUnlockedNotifier unlockedBadges={badgesForNotifier} />

            <div className="relative z-10 mx-auto w-full max-w-6xl px-1 sm:px-4 pt-2 md:pt-6 pb-8">
                {/* Stats Header */}
                <div className="mb-4 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 sm:px-6 sm:py-4 backdrop-blur-sm max-w-sm mx-auto">
                    <div className="flex items-center justify-between gap-2">
                        {/* Gauche: Complétion Badges (Hors Challenges) */}
                        <div className="text-center w-24 sm:w-28 flex-shrink-0">
                            <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                                {counts.obtained}
                                <span className="text-lg sm:text-xl text-white/40 ml-1">/ {counts.total}</span>
                            </div>
                            <div className="text-[10px] sm:text-xs font-semibold text-white/80">Badges</div>
                        </div>

                        {/* Séparation verticale */}
                        <div className="w-px h-10 bg-white/30 flex-shrink-0"></div>

                        {/* Droite: Standards, Challenges, Premium */}
                        <div className="flex-1 flex justify-around items-center gap-2 sm:gap-4 min-w-0">
                            <div className="text-center">
                                <div className="text-xl sm:text-2xl font-bold text-white tabular-nums">{counts.obtained}</div>
                                <div className="text-[9px] sm:text-[10px] font-medium text-white/80 uppercase tracking-tight">Standard</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl sm:text-2xl font-bold text-white tabular-nums">{counts.challenge}</div>
                                <div className="text-[9px] sm:text-[10px] font-medium text-white/80 uppercase tracking-tight">Challenge</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl sm:text-2xl font-bold text-amber-400 tabular-nums">{counts.premium || 0}</div>
                                <div className="text-[9px] sm:text-[10px] font-medium text-amber-400/90 uppercase tracking-tight">Premium</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex justify-center gap-4 mb-4 overflow-x-auto p-3 scrollbar-hide">
                    <button
                        onClick={() => setActiveTab("standard")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === "standard"
                            ? "bg-[#172554] text-blue-200 border border-blue-400/50 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/50 ring-offset-2 ring-offset-[#172554]"
                            : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                            }`}
                    >
                        <Award size={16} className="sm:w-4 sm:h-4" />
                        Tous les badges
                    </button>
                    <button
                        onClick={() => setActiveTab("challenges")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === "challenges"
                            ? "bg-[#CCFF00] text-[#172554] shadow-lg shadow-[#CCFF00]/25 ring-2 ring-[#CCFF00] ring-offset-2 ring-offset-[#172554]"
                            : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                            }`}
                    >
                        <Trophy size={16} className="sm:w-4 sm:h-4" />
                        Challenges
                    </button>
                </div>

                {/* Content Area */}
                <div className="min-h-[400px]">
                    {/* Standard Badges Grid (Mixed Premium) */}
                    {activeTab === "standard" && (
                        <div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {allStandardBadges.map((badge, idx) => (
                                    <BadgeCard key={`std-${idx}`} badge={badge} isPremiumUser={isPremium} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Challenges Badges Grid */}
                    {activeTab === "challenges" && (
                        <div>
                            {challengeBadges.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {challengeBadges.map((badge) => (
                                        <div
                                            key={badge.id}
                                            className="rounded-xl border border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-lg px-2 pt-4 pb-2 transition-all hover:scale-105 hover:shadow-2xl flex flex-col h-[172px] items-center text-center"
                                        >
                                            <div className="mb-3 flex flex-col items-center gap-3 flex-1">
                                                <span className="text-3xl">{badge.badge_emoji}</span>
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-semibold leading-tight text-gray-900">
                                                        {badge.badge_name}
                                                    </h3>
                                                    <p className="mt-1 text-xs leading-relaxed text-gray-600 font-normal">
                                                        Obtenu via un challenge
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-auto w-full rounded-lg bg-gradient-to-r from-yellow-100 to-amber-100 px-3 py-2 text-xs font-semibold text-yellow-800 tabular-nums">
                                                ✓ Débloqué le{" "}
                                                {new Date(badge.earned_at).toLocaleDateString("fr-FR")}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center px-4 rounded-xl bg-white/5 border border-white/10">
                                    <Trophy size={48} className="text-white/20 mb-4" />
                                    <h3 className="text-lg font-medium text-white/80">Aucun badge de challenge</h3>
                                    <p className="text-white/50 text-sm mt-2 max-w-md">
                                        Participez aux challenges hebdomadaires pour débloquer des badges exclusifs.
                                    </p>
                                    <Link
                                        href="/club?tab=challenges"
                                        className="mt-6 px-6 py-2 bg-[#CCFF00] text-[#172554] rounded-full font-medium text-sm hover:brightness-110 transition-all shadow-lg shadow-[#CCFF00]/20"
                                    >
                                        Voir les challenges
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function BadgeCard({
    badge,
    isPremiumUser
}: {
    badge: ExtendedBadge;
    isPremiumUser: boolean;
}) {
    const router = useRouter();
    const isObtained = badge.obtained;
    const isPremiumBadge = badge.isPremium;

    // Un badge premium est "verrouillé" s'il est obtenu mais que l'utilisateur n'est pas premium
    const needsPremiumToActivate = isPremiumBadge && isObtained && !isPremiumUser;

    const handleUnlock = () => {
        router.push(`/premium?returnPath=${window.location.pathname}`);
    };

    return (
        <div
            className={`group relative rounded-xl border px-2 pt-4 pb-2 transition-all flex flex-col h-[172px] items-center text-center overflow-hidden ${isPremiumBadge
                ? isObtained
                    ? isPremiumUser
                        ? "border-yellow-400 bg-gradient-to-br from-yellow-100 via-amber-100 to-yellow-50 shadow-lg shadow-amber-500/20 scale-[1.02] ring-2 ring-yellow-400/50"
                        : "border-amber-500/70 bg-white/10 shadow-lg backdrop-blur-md ring-1 ring-white/20"
                    : "border-amber-500 bg-gray-50 shadow-[0_0_0_1.5px_rgba(245,158,11,0.2)]"
                : isObtained
                    ? "border-blue-500 bg-white shadow-md hover:scale-105 hover:shadow-xl"
                    : "border-gray-200 bg-gray-50"
                }`}
        >
            {isPremiumBadge && (
                <div className="absolute top-2 right-2 z-10">
                    <span
                        className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${isPremiumUser && isObtained
                            ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                            : "bg-amber-500/20 text-amber-500 border-amber-500/30"
                            }`}
                    >
                        Premium
                    </span>
                </div>
            )}

            <div
                className={`flex-shrink-0 mb-2 h-[40px] flex items-center justify-center transition-all ${!isObtained ? "opacity-15 grayscale" : ""}`}
            >
                <BadgeIconDisplay
                    icon={badge.icon}
                    title={badge.title}
                    className="transition-all"
                    size={40}
                />
            </div>

            <div
                className={`flex-shrink-0 flex flex-col items-center justify-center min-h-0 max-h-[70px] mb-1 px-1 ${!isObtained ? "opacity-30 grayscale" : ""}`}
            >
                <h3
                    className={`text-sm font-semibold leading-tight mb-1 text-center ${isObtained
                        ? isPremiumBadge
                            ? "bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent"
                            : "text-gray-900"
                        : "text-gray-500"
                        }`}
                >
                    {badge.title}
                </h3>
                <p className={`text-[10px] leading-tight text-center line-clamp-2 ${isObtained
                    ? isPremiumBadge ? "text-amber-500 font-medium" : "text-gray-600"
                    : "text-gray-400"
                    }`}>
                    {badge.description}
                </p>
            </div>

            <div
                className="flex-shrink-0 w-full h-[36px] flex items-center justify-center mt-auto"
            >
                {needsPremiumToActivate ? (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUnlock();
                        }}
                        className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-[10px] font-bold shadow-lg hover:brightness-110 hover:scale-[1.02] transition-all animate-pulse"
                    >
                        <Lock size={10} />
                        DÉBLOQUER
                    </button>
                ) : isObtained ? (
                    <div className={`w-full rounded-lg px-3 py-1.5 text-[10px] font-bold tabular-nums ${isPremiumBadge && isPremiumUser ? "bg-amber-100 text-amber-800" : "bg-green-50 text-green-700"}`}>
                        ✓ DÉBLOQUÉ
                    </div>
                ) : (
                    <div className="text-[10px] font-medium text-gray-400 italic">
                        Non obtenu
                    </div>
                )}
            </div>
        </div>
    );
}
