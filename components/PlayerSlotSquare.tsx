"use client";

import { useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import Image from "next/image";
import type { PlayerSearchResult } from "@/lib/utils/player-utils";

interface PlayerSlotSquareProps {
    player: PlayerSearchResult | null;
    label: string;
    onClick?: () => void;
    onRemove?: () => void;
    onLevelChange?: (level: number) => void;
    isFixed?: boolean;
    isOwner?: boolean;
    className?: string;
    isWinner?: boolean;
    niveau_padel?: number | null;
    showTilde?: boolean;
    isAnonymous?: boolean;
}

// Levels from 2.0 to 10.0 in 0.2 increments
const LEVEL_OPTIONS: number[] = [];
for (let l = 2.0; l <= 10.0; l = Math.round((l + 0.2) * 10) / 10) {
    LEVEL_OPTIONS.push(l);
}

export default function PlayerSlotSquare({
    player,
    label,
    onClick,
    onRemove,
    onLevelChange,
    isFixed = false,
    isOwner = false,
    className = "",
    isWinner = false,
    niveau_padel,
    showTilde = false,
    isAnonymous = false,
}: PlayerSlotSquareProps) {
    const isClub = typeof window !== 'undefined' && !!document.body.dataset.clubSubdomain;
    const showGuestLabel = player?.type === 'guest' && player?.display_name !== 'Joueur Anonyme';
    const [showLevelPicker, setShowLevelPicker] = useState(false);

    const displayLevel = niveau_padel || player?.niveau_padel;

    const handleLevelSelect = (level: number) => {
        setShowLevelPicker(false);
        onLevelChange?.(level);
    };

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
                            {displayLevel && (
                                isAnonymous && onLevelChange ? (
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setShowLevelPicker(true); }}
                                        className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 cursor-pointer hover:bg-blue-100 active:scale-95 transition-all"
                                    >
                                        <span className="text-[8px] sm:text-[9px] font-bold text-blue-600">{displayLevel.toFixed(1)}</span>
                                        <ChevronDown size={8} className="text-blue-400" />
                                    </div>
                                ) : (
                                    <p className={`text-[7px] sm:text-[8px] font-bold ${isFixed ? '' : 'text-blue-600'} leading-none mt-0.5`} style={isFixed ? { color: 'rgb(var(--theme-secondary-accent))' } : {}}>
                                        {showTilde && "~"}{isFixed ? displayLevel.toFixed(2) : displayLevel.toFixed(1)}
                                    </p>
                                )
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

            {/* Level picker overlay */}
            {showLevelPicker && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center" onClick={() => setShowLevelPicker(false)}>
                    <div className="absolute inset-0 bg-black/60" />
                    <div className="relative z-10 w-full max-w-xs mx-4 rounded-2xl border border-white/10 bg-[#0a1a4a] p-4 shadow-2xl animate-in zoom-in-95 fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <p className="text-sm font-bold text-white mb-3 text-center">Niveau du joueur</p>
                        <div className="grid grid-cols-5 gap-1.5 max-h-[50vh] overflow-y-auto">
                            {LEVEL_OPTIONS.map((level) => {
                                const isSelected = displayLevel !== undefined && Math.abs(displayLevel - level) < 0.05;
                                return (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => handleLevelSelect(level)}
                                        className={`py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                            isSelected
                                                ? 'bg-blue-500 text-white shadow-lg'
                                                : 'bg-white/10 text-white/70 hover:bg-white/20'
                                        }`}
                                    >
                                        {level.toFixed(1)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
