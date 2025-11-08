"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import TierBadge from "../TierBadge";

type Top3Player = {
  position: number;
  nom: string;
  points: number;
  ligue: string;
};

function animateCounter(
  element: HTMLElement | null,
  start: number,
  end: number,
  duration: number = 800
) {
  if (!element) return;

  const startTime = Date.now();
  const difference = end - start;

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-out)
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + difference * easeOut);
    
    element.textContent = `${current} pts`;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      element.textContent = `${end} pts`;
    }
  };

  animate();
}

export default function LandingPagePodium() {
  const [top3Data, setTop3Data] = useState<Top3Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const pointsRefs = useRef<{ [key: number]: HTMLSpanElement | null }>({});
  const namesRefs = useRef<{ [key: number]: HTMLHeadingElement | null }>({});
  const supabase = createClientComponentClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const verifyIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const apiEndpoint = "/api/leaderboard/top3";

  async function fetchLeaderboard(): Promise<any[]> {
    try {
      const timestamp = Date.now();
      const res = await fetch(`${apiEndpoint}?t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          console.warn(`[Podium] leaderboard API returned ${res.status} (no auth/club) – using empty podium`);
          return [];
        }
        console.warn(`[Podium] leaderboard API returned ${res.status}, response ignored`);
        return [];
      }

      const raw = await res.text();
      const data = JSON.parse(raw);
      const top3 = data?.top3 || data?.leaderboard?.slice(0, 3) || [];
      console.log("📊 Données reçues de l'API top3:", top3);
      return top3;
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      return [];
    }
  }

  function extractTop3(leaderboard: any[]): Top3Player[] {
    console.log("🔍 extractTop3 appelé avec:", leaderboard);
    
    if (!leaderboard || leaderboard.length === 0) {
      console.log("⚠️ Aucune donnée leaderboard, retour des valeurs par défaut");
      return [
        { position: 1, nom: "—", points: 0, ligue: "Bronze" },
        { position: 2, nom: "—", points: 0, ligue: "Bronze" },
        { position: 3, nom: "—", points: 0, ligue: "Bronze" },
      ];
    }

    // L'API retourne déjà le top3 trié par points décroissant avec rank: 1, 2, 3
    // On utilise directement l'ordre du tableau (index 0 = rank 1, index 1 = rank 2, index 2 = rank 3)
    const result: Top3Player[] = [];
    
    // Helper pour mapper les points -> ligue
    const mapTier = (pts: number) => {
      if (pts >= 500) return 'Champion';
      if (pts >= 300) return 'Diamant';
      if (pts >= 200) return 'Or';
      if (pts >= 100) return 'Argent';
      return 'Bronze';
    };

    for (let idx = 0; idx < 3; idx++) {
      const rank = idx + 1;
      const player = leaderboard[idx];
      
      if (player) {
        // L'API retourne 'name', 'points', 'tier' (voir route.ts ligne 102-107)
        const nom = player.name || player.nom || player.username || player.player_name || "Joueur";
        const points = typeof player.points === 'number' ? player.points : (parseInt(player.points) || 0);
        const ligue = player.tier || player.ligue || mapTier(points);
        
        const playerData = {
          position: rank,
          nom: nom,
          points: points,
          ligue: ligue,
        };
        
        result.push(playerData);
        console.log(`✅ Position ${rank}: ${playerData.nom} - ${playerData.points} pts - Tier: ${playerData.ligue} (API:`, player, ")");
      } else {
        result.push({
          position: rank,
          nom: "—",
          points: 0,
          ligue: "Bronze",
        });
        console.log(`⚠️ Position ${rank}: vide (pas de joueur à l'index ${idx})`);
      }
    }

    console.log("📤 extractTop3 retourne:", result);
    return result;
  }

  const updatePodium = useCallback((top3: Top3Player[]) => {
    console.log("🔄 updatePodium appelé avec:", top3);
    const prevTop3 = top3Data;
    setTop3Data(top3);
    setLastSyncTime(new Date());
    setIsSynced(true);

    console.log("✅ Podium synchronisé avec classement ACTUEL du leaderboard:", top3, "timestamp:", new Date().toISOString());

    // Animer les changements de points après le rendu
    setTimeout(() => {
      top3.forEach((player) => {
        const pointsEl = pointsRefs.current[player.position];
        if (pointsEl) {
          const prevPlayer = prevTop3.find((p) => p.position === player.position);
          const currentPoints = prevPlayer?.points || 0;
          if (currentPoints !== player.points && prevTop3.length > 0) {
            animateCounter(pointsEl, currentPoints, player.points, 800);
          } else {
            pointsEl.textContent = `${player.points} pts`;
          }
        }

        // Mettre à jour les noms
        const nameEl = namesRefs.current[player.position];
        if (nameEl && nameEl.textContent !== player.nom) {
          nameEl.textContent = player.nom;
        }
      });
    }, 50);
  }, [top3Data]);

  async function renderPodium(top3: Top3Player[]) {
    updatePodium(top3);
  }

  async function init() {
    console.log("🚀 Initialisation du podium...");
    setIsLoading(true);
    setIsSynced(false);
    
    try {
      const leaderboard = await fetchLeaderboard();
      console.log("📥 Données brutes reçues de fetchLeaderboard:", leaderboard);
      
      if (!leaderboard || leaderboard.length === 0) {
        console.warn("⚠️ Aucune donnée dans le leaderboard, le podium restera vide");
        setIsLoading(false);
        return;
      }
      
      const top3 = extractTop3(leaderboard);
      console.log("📊 Top3 extrait:", top3);
      
      await renderPodium(top3);
      console.log("✅ Podium initialisé avec succès");
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function verifySync() {
    const leaderboard = await fetchLeaderboard();
    const currentTop3 = extractTop3(leaderboard);
    
    // Comparer avec les données affichées
    const isDifferent = currentTop3.some((player, idx) => {
      const displayed = top3Data[idx];
      return !displayed || 
        displayed.nom !== player.nom || 
        displayed.points !== player.points ||
        displayed.position !== player.position;
    });

    if (isDifferent) {
      console.warn("⚠️ Désynchronisation détectée, mise à jour forcée");
      await renderPodium(currentTop3);
    }
  }

  function startRealtimeSync() {
    // 1. Essayer WebSocket via Supabase Realtime
    try {
      const channel = supabase
        .channel("podium-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "matches",
          },
          async () => {
            console.log("🔄 Nouveau match détecté, mise à jour du podium...");
            const leaderboard = await fetchLeaderboard();
            const top3 = extractTop3(leaderboard);
            await renderPodium(top3);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "match_participants",
          },
          async () => {
            console.log("🔄 Participants mis à jour, synchronisation du podium...");
            const leaderboard = await fetchLeaderboard();
            const top3 = extractTop3(leaderboard);
            await renderPodium(top3);
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✅ WebSocket Realtime connecté pour le podium");
          } else if (status === "CHANNEL_ERROR") {
            console.warn("⚠️ Erreur WebSocket, basculement sur polling");
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.warn("⚠️ WebSocket non disponible, utilisation du polling:", error);
    }

    // 2. Polling agressif en fallback (toutes les 2 secondes)
    intervalRef.current = setInterval(async () => {
      const leaderboard = await fetchLeaderboard();
      const top3 = extractTop3(leaderboard);
      await renderPodium(top3);
    }, 2000);

    // 3. Vérification périodique toutes les 10 secondes
    verifyIntervalRef.current = setInterval(() => {
      verifySync();
    }, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (verifyIntervalRef.current) clearInterval(verifyIntervalRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }

  useEffect(() => {
    init();
    const cleanup = startRealtimeSync();
    return cleanup;
  }, []);

  // Mettre à jour les refs quand top3Data change
  useEffect(() => {
    console.log("🔄 useEffect top3Data déclenché, top3Data.length:", top3Data.length);
    
    if (top3Data.length > 0) {
      top3Data.forEach((player) => {
        console.log(`🔄 Mise à jour refs pour position ${player.position}:`, player);
        
        const nameEl = namesRefs.current[player.position];
        const pointsEl = pointsRefs.current[player.position];
        
        if (nameEl) {
          if (player.nom && player.nom !== "—") {
            nameEl.textContent = player.nom;
            console.log(`✅ Nom mis à jour pour position ${player.position}: "${player.nom}"`);
          } else {
            nameEl.textContent = "—";
          }
        } else {
          console.warn(`⚠️ nameEl est null pour position ${player.position}`);
        }
        
        if (pointsEl) {
          if (player.points !== undefined && player.points !== null) {
            pointsEl.textContent = `${player.points} pts`;
            console.log(`✅ Points mis à jour pour position ${player.position}: ${player.points} pts`);
          } else {
            pointsEl.textContent = "0 pts";
          }
        } else {
          console.warn(`⚠️ pointsEl est null pour position ${player.position}`);
        }
      });
    } else {
      console.log("⚠️ top3Data est vide, pas de mise à jour des refs");
    }
  }, [top3Data]);

  // Calculer displayData avec les données actuelles (ordre: 2, 1, 3 pour l'affichage podium)
  const displayData: Top3Player[] = [
    top3Data.find((p) => p.position === 2) || { position: 2, nom: "—", points: 0, ligue: "Bronze" },
    top3Data.find((p) => p.position === 1) || { position: 1, nom: "—", points: 0, ligue: "Bronze" },
    top3Data.find((p) => p.position === 3) || { position: 3, nom: "—", points: 0, ligue: "Bronze" },
  ];
  
  // Debug: afficher les données actuelles
  console.log("🎯 top3Data actuel:", top3Data);
  console.log("🎯 displayData calculé:", displayData);
  console.log("🎯 isLoading:", isLoading, "isSynced:", isSynced);

  const positions = [
    { class: "silver", medal: "🥈", border: "#C0C0C0", width: "240px", height: "320px" },
    { class: "gold", medal: "🥇", border: "#FFA500", width: "280px", height: "380px" },
    { class: "bronze", medal: "🥉", border: "#CD7F32", width: "240px", height: "320px" },
  ];

  return (
    <div className="relative">
      {/* Indicateur de synchronisation */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2 z-20">
        <div
          className={`w-2 h-2 rounded-full ${
            isSynced ? "bg-green-500" : "bg-gray-400"
          }`}
          style={{
            animation: isSynced ? "pulse 2s ease-in-out infinite" : "none",
          }}
        />
        <span className="text-xs text-white/60">
          {isSynced ? "Synchronisé en temps réel" : "Chargement..."}
        </span>
      </div>

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
          // Un joueur est "vide" seulement si le nom est "—" ET qu'il n'y a pas encore de données chargées
          const isEmpty = (player.nom === "—" || !player.nom) && top3Data.length === 0;
          const hasData = player.nom && player.nom !== "—" && player.points >= 0;
          
          console.log(`🎨 Rendering position ${player.position}: nom="${player.nom}", points=${player.points}, isEmpty=${isEmpty}, hasData=${hasData}`);

          return (
            <motion.div
              key={pos.class}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              data-position={player.position}
              className={`landing-podium__card landing-podium__card--${pos.class}`}
              style={{
                position: "relative",
                width: pos.width,
                height: pos.height,
                background: "#FFFDF7",
                border: `3px solid ${pos.border}`,
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
                  ref={(el) => {
                    if (el) {
                      namesRefs.current[player.position] = el;
                      // Forcer la mise à jour du texte
                      if (hasData) {
                        el.textContent = player.nom;
                      } else {
                        el.textContent = "—";
                      }
                    }
                  }}
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
                  ref={(el) => {
                    if (el) {
                      pointsRefs.current[player.position] = el;
                      // Forcer la mise à jour du texte
                      if (hasData) {
                        el.textContent = `${player.points} pts`;
                      } else {
                        el.textContent = "0 pts";
                      }
                    }
                  }}
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
              <div style={{ marginTop: "auto", paddingBottom: "8px" }}>
                <TierBadge tier={player.ligue as "Bronze" | "Argent" | "Or" | "Diamant" | "Champion"} size="md" />
              </div>
            </motion.div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}
