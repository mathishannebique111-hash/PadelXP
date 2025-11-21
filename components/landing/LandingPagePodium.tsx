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
      width: "240px", 
      height: "320px" 
    },
    { 
      class: "gold", 
      medal: "🥇", 
      border: "#F59E0B",
      tintColor: "rgba(255, 215, 0, 0.2)",
      width: "280px", 
      height: "380px" 
    },
    { 
      class: "bronze", 
      medal: "🥉", 
      border: "#B45309",
      tintColor: "rgba(205, 127, 50, 0.15)",
      width: "240px", 
      height: "320px" 
    },
  ];

  return (
    <div className="relative">
      <div
        className="landing-podium__container"
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: "24px",
          maxWidth: "1000px",
          margin: "0 auto",
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
              className="landing-podium__card relative overflow-hidden"
              style={{
                position: "relative",
                width: pos.width,
                height: pos.height,
                background: "#FFFDF7",
                border: `4px solid ${pos.border}`,
                borderRadius: "16px",
                padding: "32px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow:
                  pos.class === "gold"
                    ? "0 0 30px rgba(255, 165, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.1)"
                    : "0 4px 16px rgba(0, 0, 0, 0.1)",
                // Légère teinte colorée transparente
                backgroundColor: `color-mix(in srgb, #FFFDF7 85%, ${pos.tintColor})`,
              }}
            >
              {/* Médaille */}
              <div
                style={{
                  position: "absolute",
                  top: "-24px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: "64px",
                  zIndex: 10,
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
                }}
              >
                {pos.medal}
              </div>

              {/* Contenu principal centré verticalement */}
              <div
                className="relative z-10"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                  width: "100%",
                  gap: "12px",
                }}
              >
                {/* Nom du joueur */}
                <h2
                  className="player-name"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: pos.class === "gold" ? "48px" : "40px",
                    fontWeight: 700,
                    color: "#1F2121",
                    marginTop: "24px",
                    textAlign: "center",
                    lineHeight: 1.2,
                    minHeight: "44px",
                    width: "100%",
                  }}
                >
                  {hasData ? player.nom : "—"}
                </h2>

                {/* Points */}
                <span
                  className="points-value"
                  style={{
                    fontSize: pos.class === "gold" ? "52px" : "48px",
                    fontWeight: 700,
                    color: "#1F2121",
                    lineHeight: 1.2,
                    textAlign: "center",
                    width: "100%",
                  }}
                >
                  {hasData ? `${player.points} pts` : "0 pts"}
                </span>
              </div>

              {/* Badge de ligue en bas */}
              <div className="relative z-10" style={{ marginTop: "auto", paddingBottom: "8px" }}>
                <TierBadge tier={player.ligue as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="md" />
              </div>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
