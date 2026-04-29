"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import type { PlayerSearchResult } from "@/lib/utils/player-utils";

interface PlayerSlotSquareProps {
    player: PlayerSearchResult | null;
    label: string;
    onClick?: () => void;
    onRemove?: () => void;
    isFixed?: boolean;
    isOwner?: boolean;
    className?: string;
    isWinner?: boolean;
    niveau_padel?: number | null;
    showTilde?: boolean;
}

export default function PlayerSlotSquare({
    player,
    label,
    onClick,
    onRemove,
    isFixed = false,
    isOwner = false,
    className = "",
    isWinner = false,
    niveau_padel,
    showTilde = false,
}: PlayerSlotSquareProps) {
    const isClub = typeof window !== 'undefined' && !!document.body.dataset.clubSubdomain;
    const showGuestLabel = player?.type === 'guest' && player?.display_name !== 'Joueur Anonyme';

    return (
        <div className={`relative flex flex-col items-center gap-1 ${className}`}>
            {showGuestLabel && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] font-bold text-blue-400 uppercase tracking-widest leading-none z-10">
                    Invité
                </span>
            )}
            <button
                type="button"
                onClick={onClick}
                disabled={isFixed}
                className={`relative aspect-square w-full rounded-xl transition-all duration-200 flex flex-col items-center justify-center overflow-hidden
                    ${isFixed
                        ? `bg-white/5 border cursor-default ${!isClub ? 'border-white/10' : ''}`
                        : player
                            ? "bg-white border border-white/80 shadow-lg shadow-white/5"
                            : "bg-white/[0.03] border border-dashed border-white/20 hover:bg-white/[0.06] hover:border-white/30"
                    }
                    ${isWinner ? (isClub ? "ring-2 ring-offset-2 ring-offset-[rgb(var(--theme-page))] ring-[rgb(var(--theme-accent))]" : "ring-2 ring-offset-2 ring-offset-[#071554]") : ""}
                `}
                style={isFixed && isClub ? { borderColor: 'rgba(var(--theme-text), 0.1)' } : undefined}
            >
                {player ? (
                    <>
                        {onRemove && !isOwner && (
                            <div
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="absolute top-1 right-1 z-20 p-0.5 bg-red-500/90 rounded-full text-white hover:scale-110 active:scale-95 transition-all"
                            >
                                <Plus size={10} className="rotate-45" />
                            </div>
                        )}
                        <div className="flex items-center justify-center mb-0.5 overflow-hidden rounded-full w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 border border-gray-200">
                            {player.avatar_url ? (
                                <Image
                                    src={player.avatar_url}
                                    alt={`${player.first_name} ${player.last_name}`}
                                    width={44}
                                    height={44}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2/3 h-2/3">
                                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="px-1 text-center w-full">
                            <p className={`${isFixed ? 'text-white' : 'text-[#071554]'} text-[8px] sm:text-[10px] font-bold truncate leading-tight`}>
                                {player.first_name}
                            </p>
                            <p className={`${isFixed ? 'text-white' : 'text-[#071554]'} text-[8px] sm:text-[10px] font-black truncate uppercase leading-tight`}>
                                {player.last_name}
                            </p>
                            {(niveau_padel || player.niveau_padel) && (
                                <p className={`text-[7px] sm:text-[8px] font-bold ${isFixed ? '' : 'text-blue-600'} leading-none mt-0.5`} style={isFixed ? { color: 'rgb(var(--theme-secondary-accent))' } : {}}>
                                    {showTilde && "~"}{(niveau_padel || player.niveau_padel)?.toFixed(1)}
                                </p>
                            )}
                        </div>
                    </>
                ) : (
                    <Plus size={20} strokeWidth={1.5} className="text-white/25" />
                )}
            </button>
            {label && (
                <span className="text-[9px] sm:text-xs font-black text-white uppercase tracking-widest leading-none">
                    {label}
                </span>
            )}
        </div>
    );
}
