"use client";

import { forwardRef } from "react";

export interface StoryRankData {
  playerName: string;
  rank: number;
  points: number;
  totalMatches: number;
  wins: number;
  losses: number;
  scope: string; // "Département", "Région", "France", "Belgique"
  scopeDetail?: string; // e.g. "Var (83)", "Provence-Alpes-Côte d'Azur"
  top3: { name: string; points: number }[];
  niveauPadel?: number | null;
}

const TIER_CONFIG = [
  { min: 500, label: "Champion", color: "#a855f7", glow: "#a855f733" },
  { min: 300, label: "Diamant", color: "#60a5fa", glow: "#60a5fa33" },
  { min: 200, label: "Or", color: "#fbbf24", glow: "#fbbf2433" },
  { min: 100, label: "Argent", color: "#94a3b8", glow: "#94a3b833" },
  { min: 0, label: "Bronze", color: "#d97706", glow: "#d9770633" },
];

function getTier(points: number) {
  return TIER_CONFIG.find((t) => points >= t.min) || TIER_CONFIG[TIER_CONFIG.length - 1];
}

const StoryRankCard = forwardRef<HTMLDivElement, { data: StoryRankData }>(
  ({ data }, ref) => {
    const { playerName, rank, points, totalMatches, wins, losses, scope, scopeDetail, top3, niveauPadel } = data;
    const tier = getTier(points);
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1920,
          background: "linear-gradient(180deg, #0a0a1a 0%, #111133 50%, #0a0a1a 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "white",
          position: "absolute",
          left: "-9999px",
          top: 0,
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "25%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${tier.glow} 0%, transparent 70%)`,
          }}
        />

        {/* Logo */}
        <img
          src="/padelxp-logo-transparent.png"
          alt="PadelXP"
          style={{ height: 60, marginTop: 120, marginBottom: 60, opacity: 0.6, objectFit: "contain" }}
        />

        {/* Scope label */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 6,
            opacity: 0.5,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Classement {scope}
        </div>
        {scopeDetail && (
          <div style={{ fontSize: 32, fontWeight: 600, opacity: 0.4, marginBottom: 48 }}>
            {scopeDetail}
          </div>
        )}
        {!scopeDetail && <div style={{ height: 48 }} />}

        {/* Rank */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 56, fontWeight: 700, opacity: 0.5 }}>#</span>
          <span style={{ fontSize: 200, fontWeight: 900, lineHeight: 1, color: tier.color }}>
            {rank}
          </span>
        </div>

        {/* Player name */}
        <div style={{ fontSize: 48, fontWeight: 800, marginBottom: 12 }}>{playerName}</div>

        {/* Tier badge */}
        <div
          style={{
            padding: "12px 48px",
            borderRadius: 20,
            border: `2px solid ${tier.color}66`,
            background: `${tier.color}18`,
            marginBottom: 60,
          }}
        >
          <span style={{ fontSize: 30, fontWeight: 800, color: tier.color, letterSpacing: 6, textTransform: "uppercase" }}>
            {tier.label}
          </span>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginBottom: 70,
          }}
        >
          {[
            { label: "Points", value: String(points) },
            { label: "Matchs", value: String(totalMatches) },
            { label: "Winrate", value: `${winRate}%` },
            ...(niveauPadel ? [{ label: "Niveau", value: niveauPadel.toFixed(2) }] : []),
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                padding: "28px 40px",
                borderRadius: 24,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                textAlign: "center",
                minWidth: 170,
              }}
            >
              <div style={{ fontSize: 48, fontWeight: 900, marginBottom: 8 }}>{stat.value}</div>
              <div style={{ fontSize: 22, fontWeight: 600, opacity: 0.4, letterSpacing: 3, textTransform: "uppercase" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Top 3 */}
        {top3.length > 0 && (
          <div style={{ width: 800 }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 6,
                opacity: 0.35,
                textTransform: "uppercase",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              Top 3
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {top3.slice(0, 3).map((player, i) => {
                const medals = ["#fbbf24", "#94a3b8", "#d97706"];
                const isCurrentUser = player.name === playerName;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "20px 32px",
                      borderRadius: 20,
                      background: isCurrentUser ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                      border: isCurrentUser ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                      <span style={{ fontSize: 32, fontWeight: 900, color: medals[i], width: 50 }}>
                        {i + 1}.
                      </span>
                      <span style={{ fontSize: 32, fontWeight: isCurrentUser ? 800 : 600, opacity: isCurrentUser ? 1 : 0.7 }}>
                        {player.name}
                      </span>
                    </div>
                    <span style={{ fontSize: 30, fontWeight: 700, opacity: 0.5 }}>
                      {player.points} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 22, opacity: 0.3, letterSpacing: 4 }}>padelxp.eu</div>
        </div>
      </div>
    );
  }
);

StoryRankCard.displayName = "StoryRankCard";
export default StoryRankCard;
