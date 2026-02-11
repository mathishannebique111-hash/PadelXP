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
          ${isWinner ? "ring-4 ring-padel-green ring-offset-2 ring-offset-[#071554]" : ""}
        `}
            >
                {player ? (
                    <>
                        <div className="flex items-center justify-center text-[#071554] text-lg sm:text-2xl font-black mb-1">
                            {initials || <UserPlus size={20} />}
                        </div>
                        <div className="px-1 text-center w-full">
                            <p className="text-[#071554] text-[9px] sm:text-xs font-bold truncate leading-none">
                                {player.first_name}
                            </p>
                            <p className="text-[#071554] text-[9px] sm:text-xs font-black truncate uppercase leading-none">
                                {player.last_name}
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-center text-white/40 mb-1">
                            <Plus size={20} className="sm:size-24" />
                        </div>
                        <span className="text-white/60 text-[9px] sm:text-xs font-medium uppercase tracking-tighter">
                            Ajouter
                        </span>
                    </>
                )}

                {/* Badge type */}
                {player?.type === 'guest' && (
                    <div className="absolute top-1 right-1 bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Invité
                    </div>
                )}
            </button>
            <span className="text-[10px] sm:text-xs font-medium text-white/50 uppercase tracking-widest text-center">
                {label}
            </span>
        </div>
    );
}
