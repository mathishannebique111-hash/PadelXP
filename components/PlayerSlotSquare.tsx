"use client";

import { UserPlus, Plus } from "lucide-react";
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
    const initials = player
        ? `${player.first_name?.[0] || ""}${player.last_name?.[0] || ""}`.toUpperCase()
        : "";

    // Afficher "Invité" uniquement si c'est un guest et que ce n'est pas un joueur anonyme
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
                className={`relative aspect-square w-full rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1 overflow-hidden
          ${isFixed
                        ? "bg-white/5 border-white/10 cursor-default"
                        : player
                            ? "bg-white border-white shadow-lg shadow-white/10"
                            : "bg-white/5 border-dashed border-white/30 hover:border-padel-green hover:bg-white/10"
                    }
          ${isWinner ? "ring-2 ring-padel-green ring-offset-2 ring-offset-[#071554]" : ""}
        `}
            >
                {player ? (
                    <>
                        {onRemove && !isOwner && (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove();
                                }}
                                className="absolute top-1 right-1 z-20 p-1 bg-red-500 rounded-full text-white shadow-md hover:scale-110 active:scale-95 transition-all"
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
                                    {/* Use Player icon to match Leaderboard style */}
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="w-2/3 h-2/3"
                                    >
                                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="px-1 text-center w-full space-y-0.5">
                            <div className="leading-none">
                                <p className={`${isFixed ? 'text-white' : 'text-[#071554]'} text-[8px] sm:text-[10px] font-bold truncate`}>
                                    {player.first_name}
                                </p>
                                <p className={`${isFixed ? 'text-white' : 'text-[#071554]'} text-[8px] sm:text-[10px] font-black truncate uppercase`}>
                                    {player.last_name}
                                </p>
                            </div>

                            {/* Affichage du niveau */}
                            <div className={`text-[7px] sm:text-[9px] font-black italic ${isFixed ? 'text-padel-green' : 'text-blue-600'} leading-none`}>
                                {showTilde && <span className="mr-0.5">~</span>}
                                {niveau_padel ? niveau_padel.toFixed(2) : (player.niveau_padel ? player.niveau_padel.toFixed(2) : '')}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <Plus size={18} className="text-white/40" />
                        <span className="text-white/60 text-[8px] font-medium uppercase tracking-tighter">
                            Ajouter
                        </span>
                    </div>
                )}
            </button>
            <div className="flex flex-col items-center gap-0">
                <span className="text-[9px] sm:text-xs font-black text-white uppercase tracking-widest leading-none">
                    {label}
                </span>
            </div>
        </div >
    );
}
