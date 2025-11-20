"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { LeaderboardEntry } from "@/lib/types";
import TierBadge from "./TierBadge";
import Image from "next/image";

type PodiumProps = {
  top3: LeaderboardEntry[];
};

function tierForPoints(points: number) {
  if (points >= 500) return { label: "Champion", className: "bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white" };
  if (points >= 300) return { label: "Diamant", className: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white" };
  if (points >= 200) return { label: "Or", className: "bg-gradient-to-r from-amber-400 to-yellow-500 text-white" };
  if (points >= 100) return { label: "Argent", className: "bg-gradient-to-r from-zinc-300 to-zinc-400 text-zinc-800" };
  return { label: "Bronze", className: "bg-gradient-to-r from-orange-400 to-orange-600 text-white" };
}

export default function Podium({ top3 }: PodiumProps) {
  const [displayTop3, setDisplayTop3] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (top3.length >= 3) {
      setDisplayTop3([top3[1], top3[0], top3[2]]); // Ordre: 2ème, 1er, 3ème
    } else if (top3.length > 0) {
      const padded = [...top3];
      while (padded.length < 3) {
        padded.push({} as LeaderboardEntry);
      }
      setDisplayTop3([padded[1] || padded[0], padded[0], padded[2] || padded[0]]);
    }
  }, [top3]);

  const positions = [
    { class: "silver", medalSrc: "/images/Médaille top2.png", medalAlt: "Médaille 2ème place", border: "#C0C0C0", width: "280px" },
    { class: "gold", medalSrc: "/images/Médaille top1.png", medalAlt: "Médaille 1ère place", border: "#FFA500", width: "320px" },
    { class: "bronze", medalSrc: "/images/Médaille top3.png", medalAlt: "Médaille 3ème place", border: "#CD7F32", width: "280px" },
  ];

  return (
    <div className="w-full py-12 px-4">
      <div className="flex items-end justify-center gap-6 max-w-5xl mx-auto">
        {positions.map((pos, idx) => {
          const player = displayTop3[idx];
          const isEmpty = !player || !player.player_name;
          const tier = player ? tierForPoints(player.points) : { label: "Bronze", className: "bg-gradient-to-r from-orange-400 to-orange-600 text-white" };

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className={`relative rounded-2xl overflow-visible transition-all duration-300 ${
                pos.class === "gold" ? "scale-110 z-10" : "scale-100"
              }`}
              style={{
                width: pos.width,
                minHeight: pos.class === "gold" ? "420px" : "360px",
                background: "#FFFDF7",
                border: `3px solid ${pos.border}`,
                boxShadow: pos.class === "gold" 
                  ? "0 0 30px rgba(255, 165, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.1)"
                  : "0 4px 16px rgba(0, 0, 0, 0.1)",
              }}
            >
              {/* Médaille */}
              <div 
                className="absolute -top-6 -right-6 z-20"
                style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }}
              >
                <Image src={pos.medalSrc} alt={pos.medalAlt} width={64} height={64} className="w-12 h-12 md:w-16 md:h-16" unoptimized />
              </div>

              {/* Header: Nom */}
              <div className="relative pt-8 pb-4 px-6">
                <h2 
                  className="podium-card__name"
                  style={{
                    display: "block",
                    visibility: "visible",
                    opacity: 1,
                    color: "#1F2121",
                    fontSize: pos.class === "gold" ? "48px" : "40px",
                    fontWeight: 700,
                    marginBottom: "20px",
                    textAlign: "center",
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                    zIndex: 10,
                  }}
                >
                  {isEmpty ? "—" : (player.player_name || "Joueur")}
                </h2>
              </div>

              {/* Stats: P, V, D */}
              <div className="px-6 py-4">
                <div className="grid grid-cols-3 gap-4 max-w-[240px] mx-auto">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-[#626C71] uppercase">P</span>
                    <motion.span
                      key={player?.matches || 0}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-bold text-[#1F2121] leading-none"
                    >
                      {isEmpty ? "0" : (player.matches || 0)}
                    </motion.span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-[#626C71] uppercase">V</span>
                    <motion.span
                      key={player?.wins || 0}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-bold text-[#1F2121] leading-none"
                    >
                      {isEmpty ? "0" : (player.wins || 0)}
                    </motion.span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-[#626C71] uppercase">D</span>
                    <motion.span
                      key={player?.losses || 0}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl font-bold text-[#1F2121] leading-none"
                    >
                      {isEmpty ? "0" : (player.losses || 0)}
                    </motion.span>
                  </div>
                </div>
              </div>

              {/* Footer: Badge de ligue */}
              <div className="px-6 pb-6 pt-4 flex justify-center">
                <TierBadge tier={tier.label as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="md" />
              </div>

              {/* Glow effect pour la 1ère place */}
              {pos.class === "gold" && (
                <div 
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{
                    boxShadow: "0 0 30px rgba(255, 165, 0, 0.3)",
                    animation: "goldGlow 2s ease-in-out infinite",
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes goldGlow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.3);
          }
          50% { 
            box-shadow: 0 0 30px rgba(255, 165, 0, 0.5);
          }
        }
      `}</style>
    </div>
  );
}

