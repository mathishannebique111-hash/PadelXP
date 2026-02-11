"use client";

import { UserPlus, Plus } from "lucide-react";
import Image from "next/image";
import type { PlayerSearchResult } from "@/lib/utils/player-utils";

interface PlayerSlotSquareProps {
    player: PlayerSearchResult | null;
    label: string;
    onClick?: () => void;
    isFixed?: boolean;
    className?: string;
    isWinner?: boolean;
}

export default function PlayerSlotSquare({
    player,
    label,
    onClick,
    isFixed = false,
    className = "",
    isWinner = false,
}: PlayerSlotSquareProps) {
    const initials = player
        ? `${player.first_name?.[0] || ""}${player.last_name?.[0] || ""}`.toUpperCase()
        : "";

    return (
        <div className={`flex flex-col items-center gap-2 ${className}`}>
            <button
                type="button"
                onClick={onClick}
                disabled={isFixed}
                className={`relative aspect-square w-full rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 overflow-hidden
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
                        <div className="flex items-center justify-center mb-1 overflow-hidden rounded-full w-9 h-9 sm:w-11 sm:h-11 bg-[#071554]/10">
                            {player.avatar_url ? (
                                <Image
                                    src={player.avatar_url}
                                    alt={`${player.first_name} ${player.last_name}`}
                                    width={44}
                                    height={44}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className={`text-base sm:text-xl font-black ${isFixed ? 'text-white' : 'text-[#071554]'}`}>
                                    {initials || <UserPlus size={18} />}
                                </div>
                            )}
                        </div>
                        <div className="px-1 text-center w-full">
                            <p className={`${isFixed ? 'text-white' : 'text-[#071554]'} text-[8px] sm:text-[10px] font-bold truncate leading-none`}>
                                {player.first_name}
                            </p>
                            <p className={`${isFixed ? 'text-white' : 'text-[#071554]'} text-[8px] sm:text-[10px] font-black truncate uppercase leading-none`}>
                                {player.last_name}
                            </p>
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
                {player?.type === 'guest' && (
                    <span className="text-[7px] font-bold text-blue-400 uppercase tracking-widest leading-none mt-0.5">
                        Invité
                    </span>
                )}
            </div>
        </div>
    );
}
