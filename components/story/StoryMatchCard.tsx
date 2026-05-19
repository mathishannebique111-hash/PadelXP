"use client";

import { forwardRef } from "react";

export interface StoryMatchData {
  isWin: boolean;
  scoreTeam1: number;
  scoreTeam2: number;
  scoreDetails?: string;
  team1Players: string[];
  team2Players: string[];
  userTeam: 1 | 2;
  date: string;
  location?: string;
  playerName: string;
}

const StoryMatchCard = forwardRef<HTMLDivElement, { data: StoryMatchData }>(
  ({ data }, ref) => {
    const {
      isWin,
      scoreTeam1,
      scoreTeam2,
      scoreDetails,
      team1Players,
      team2Players,
      userTeam,
      date,
      location,
      playerName,
    } = data;

    const accentColor = isWin ? "#22c55e" : "#ef4444";
    const accentBg = isWin ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)";
    const resultText = isWin ? "VICTOIRE" : "DEFAITE";

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
          justifyContent: "center",
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
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}22 0%, transparent 70%)`,
          }}
        />

        {/* Logo */}
        <img
          src="/padelxp-logo-transparent.png"
          alt="PadelXP"
          style={{ height: 60, marginBottom: 80, opacity: 0.6, objectFit: "contain" }}
        />

        {/* Result badge */}
        <div
          style={{
            padding: "20px 80px",
            borderRadius: 24,
            background: accentBg,
            border: `3px solid ${accentColor}`,
            marginBottom: 60,
          }}
        >
          <span style={{ fontSize: 56, fontWeight: 900, letterSpacing: 12, color: accentColor }}>
            {resultText}
          </span>
        </div>

        {/* Score */}
        <div style={{ fontSize: 180, fontWeight: 900, letterSpacing: 16, marginBottom: 16, lineHeight: 1 }}>
          {scoreTeam1} - {scoreTeam2}
        </div>

        {/* Score details */}
        {scoreDetails && (
          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
              opacity: 0.5,
              marginBottom: 60,
              letterSpacing: 4,
            }}
          >
            {scoreDetails}
          </div>
        )}
        {!scoreDetails && <div style={{ height: 60 }} />}

        {/* Teams */}
        <div
          style={{
            display: "flex",
            width: 900,
            gap: 40,
            marginBottom: 80,
          }}
        >
          {/* Team 1 */}
          <div
            style={{
              flex: 1,
              padding: "40px 32px",
              borderRadius: 28,
              background: userTeam === 1 ? accentBg : "rgba(255,255,255,0.05)",
              border: userTeam === 1 ? `2px solid ${accentColor}44` : "2px solid rgba(255,255,255,0.1)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: 6,
                opacity: 0.4,
                marginBottom: 24,
                textTransform: "uppercase",
              }}
            >
              Equipe 1
            </div>
            {team1Players.map((name, i) => (
              <div
                key={i}
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  marginBottom: 8,
                  opacity: 0.9,
                }}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Team 2 */}
          <div
            style={{
              flex: 1,
              padding: "40px 32px",
              borderRadius: 28,
              background: userTeam === 2 ? accentBg : "rgba(255,255,255,0.05)",
              border: userTeam === 2 ? `2px solid ${accentColor}44` : "2px solid rgba(255,255,255,0.1)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: 6,
                opacity: 0.4,
                marginBottom: 24,
                textTransform: "uppercase",
              }}
            >
              Equipe 2
            </div>
            {team2Players.map((name, i) => (
              <div
                key={i}
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  marginBottom: 8,
                  opacity: 0.9,
                }}
              >
                {name}
              </div>
            ))}
          </div>
        </div>

        {/* Date + location */}
        <div style={{ textAlign: "center", opacity: 0.4 }}>
          <div style={{ fontSize: 32, fontWeight: 600, marginBottom: 8 }}>{date}</div>
          {location && <div style={{ fontSize: 28 }}>{location}</div>}
        </div>

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
          <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.5 }}>{playerName}</div>
          <div style={{ fontSize: 22, opacity: 0.3, letterSpacing: 4 }}>padelxp.eu</div>
        </div>
      </div>
    );
  }
);

StoryMatchCard.displayName = "StoryMatchCard";
export default StoryMatchCard;
