"use client";

import { useState } from "react";
import { logger } from "@/lib/logger";

interface MatchFinderItemProps {
  match: any;
  accentColor: string;
  onJoinSuccess: () => void;
}

export default function MatchFinderItem({ match, accentColor, onJoinSuccess }: MatchFinderItemProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Un match a toujours 4 places selon l'utilisateur.
  // match.needed_players est le nombre de places "ouvertes" au club.
  // Les places restantes (4 - 1 - needed_players) sont "bloquées" (amis du créateur).
  const totalSlots = 4;
  const creatorSlot = 1;
  const neededSlots = match.needed_players;
  const blockedSlots = totalSlots - creatorSlot - neededSlots;
  
  const participants = match.participants || [];
  const currentParticipantsCount = participants.length; // Inclut le créateur car auto-join
  
  const remainingNeeded = Math.max(0, neededSlots - (currentParticipantsCount - 1));

  const handleJoin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/matches/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchFinderId: match.id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur lors de l'inscription");

      onJoinSuccess();
    } catch (err: any) {
      logger.error("Error joining match", { err });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const date = new Date(match.scheduled_at);
  const formattedDate = date.toLocaleDateString("fr-FR", { weekday: 'short', day: 'numeric', month: 'short' });
  const formattedTime = date.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all cursor-pointer group"
      onClick={() => setShowDetails(!showDetails)}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-xs text-white/40 uppercase tracking-wider font-bold mb-1">{formattedDate} • {formattedTime}</div>
            <div className="font-bold text-lg">Recherche {neededSlots} joueur{neededSlots > 1 ? 's' : ''}</div>
          </div>
          <div 
            className="px-2 py-1 rounded text-[10px] font-bold uppercase"
            style={{ backgroundColor: `${accentColor}33`, color: accentColor }}
          >
            Niv. {match.min_level} - {match.max_level}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex -space-x-2">
            {participants.slice(0, 4).map((p: any, i: number) => (
              <div key={i} className="w-8 h-8 rounded-full bg-white/10 border-2 border-black flex items-center justify-center text-[10px] font-bold overflow-hidden">
                {p.profiles?.display_name?.substring(0, 1) || "P"}
              </div>
            ))}
            {[...Array(remainingNeeded)].map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center text-[10px] text-white/20 animate-pulse">
                ?
              </div>
            ))}
            {[...Array(blockedSlots)].map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-black/40 border-2 border-white/5 flex items-center justify-center text-[10px] text-white/10">
                🔒
              </div>
            ))}
          </div>
          <div className="text-[10px] text-white/40">
            {remainingNeeded > 0 ? `${remainingNeeded} place${remainingNeeded > 1 ? 's' : ''} libre${remainingNeeded > 1 ? 's' : ''}` : "Complet"}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-white/60">
            <div>Par {match.creator?.display_name || "Un joueur"}</div>
            <div className="group-hover:translate-x-1 transition-transform">→</div>
        </div>
      </div>

      {showDetails && (
        <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-white/[0.02]" onClick={(e) => e.stopPropagation()}>
          {match.description && (
            <p className="text-xs text-white/60 mb-4 bg-black/20 p-2 rounded italic">"{match.description}"</p>
          )}
          
          <div className="space-y-2 mb-4">
            <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Participants</div>
            {participants.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}></span>
                    {p.profiles?.display_name || "Joueur"}
                    {p.user_id === match.creator_id && <span className="text-[8px] bg-white text-black px-1 rounded">HÔTE</span>}
                </div>
                <div className="text-white/40 text-[10px]">Niv. {p.profiles?.padel_level}</div>
              </div>
            ))}
          </div>

          {error && <div className="text-red-500 text-[10px] mb-2">{error}</div>}

          <button
            onClick={handleJoin}
            disabled={loading || remainingNeeded === 0}
            className="w-full py-2 rounded-lg text-xs font-bold transition-all"
            style={{ 
                backgroundColor: remainingNeeded > 0 ? accentColor : 'transparent',
                border: remainingNeeded === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                color: remainingNeeded > 0 ? 'white' : 'rgba(255,255,255,0.4)',
                opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "Chargement..." : remainingNeeded > 0 ? "REJOINDRE LE MATCH" : "MATCH COMPLET"}
          </button>
        </div>
      )}
    </div>
  );
}
