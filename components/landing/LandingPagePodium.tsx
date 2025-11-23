"use client";

import { motion } from "framer-motion";
import TierBadge from "../TierBadge";

type Top3Player = {
  position: number;
  nom: string;
  points: number;
  ligue: string;
};

export default function LandingPagePodium() {
  // Données d'exemple statiques pour donner envie d'atteindre la 1ère place
  const top3Data: Top3Player[] = [
    { position: 1, nom: "Alex M.", points: 342, ligue: "Diamant" },
    { position: 2, nom: "Sarah L.", points: 298, ligue: "Or" },
    { position: 3, nom: "Lucas D.", points: 267, ligue: "Or" },
  ];

  // Calculer displayData avec les données (ordre: 2, 1, 3 pour l'affichage podium)
  const displayData: Top3Player[] = [
    top3Data.find((p) => p.position === 2) || { position: 2, nom: "—", points: 0, ligue: "Bronze" },
    top3Data.find((p) => p.position === 1) || { position: 1, nom: "—", points: 0, ligue: "Bronze" },
    top3Data.find((p) => p.position === 3) || { position: 3, nom: "—", points: 0, ligue: "Bronze" },
  ];

  const positions = [
    { 
      class: "silver", 
      medal: "🥈", 
      border: "#9CA3AF",
      tintColor: "rgba(192, 192, 192, 0.15)",
    },
    { 
      class: "gold", 
      medal: "🥇", 
      border: "#F59E0B",
      tintColor: "rgba(255, 215, 0, 0.2)",
    },
    { 
      class: "bronze", 
      medal: "🥉", 
      border: "#B45309",
      tintColor: "rgba(205, 127, 50, 0.15)",
    },
  ];

  return (
    <div className="relative">
      <div
        className="landing-podium__container flex items-end justify-center gap-3 sm:gap-4 md:gap-6 max-w-7xl mx-auto px-2 sm:px-4"
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        {positions.map((pos, idx) => {
          const player = displayData[idx];
          const hasData = player.nom && player.nom !== "—" && player.points >= 0;

          return (
            <motion.div
              key={pos.class}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              data-position={player.position}
              className={`landing-podium__card relative overflow-hidden flex flex-col items-center justify-between bg-[#FFFDF7] border-2 sm:border-4 rounded-lg sm:rounded-xl sm:p-6 p-3 ${
                pos.class === "silver" 
                  ? "w-[90px] h-[200px] sm:w-[160px] sm:h-[260px] md:w-[200px] md:h-[300px] lg:w-[240px] lg:h-[320px]"
                  : pos.class === "gold"
                  ? "w-[100px] h-[240px] sm:w-[180px] sm:h-[320px] md:w-[220px] md:h-[360px] lg:w-[280px] lg:h-[380px]"
                  : "w-[90px] h-[200px] sm:w-[160px] sm:h-[260px] md:w-[200px] md:h-[300px] lg:w-[240px] lg:h-[320px]"
              }`}
              style={{
                position: "relative",
                borderColor: pos.border,
                boxShadow:
                  pos.class === "gold"
                    ? "0 0 30px rgba(255, 165, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.1)"
                    : "0 4px 16px rgba(0, 0, 0, 0.1)",
                backgroundColor: `color-mix(in srgb, #FFFDF7 85%, ${pos.tintColor})`,
              }}
            >
              {/* Médaille */}
              <div
                className="absolute -top-3 sm:-top-6 left-1/2 -translate-x-1/2 z-10 drop-shadow-md"
                style={{
                  fontSize: "clamp(32px, 8vw, 64px)",
                }}
              >
                {pos.medal}
              </div>

              {/* Contenu principal centré verticalement */}
              <div
                className="relative z-10 flex flex-col items-center justify-center flex-1 w-full gap-1 sm:gap-2 md:gap-3 mt-4 sm:mt-6"
              >
                {/* Nom du joueur */}
                <h2
                  className={`player-name flex items-center justify-center font-bold text-[#1F2121] text-center leading-tight w-full break-words ${
                    pos.class === "gold" 
                      ? "text-xs sm:text-lg md:text-2xl lg:text-4xl xl:text-[48px]" 
                      : "text-xs sm:text-base md:text-xl lg:text-2xl xl:text-[40px]"
                  }`}
                  style={{
                    minHeight: "auto",
                    paddingTop: "clamp(16px, 4vw, 24px)",
                  }}
                >
                  {hasData ? player.nom : "—"}
                </h2>

                {/* Points */}
                <span
                  className={`points-value font-bold text-[#1F2121] text-center leading-tight w-full ${
                    pos.class === "gold"
                      ? "text-xs sm:text-lg md:text-2xl lg:text-3xl xl:text-[52px]"
                      : "text-xs sm:text-base md:text-xl lg:text-2xl xl:text-[48px]"
                  }`}
                >
                  {hasData ? `${player.points} pts` : "0 pts"}
                </span>
              </div>

              {/* Badge de ligue en bas */}
              <div className="relative z-10 mt-auto pb-1 sm:pb-2">
                <div className="scale-75 sm:scale-90 md:scale-100">
                  <TierBadge tier={player.ligue as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="md" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
