"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { usePopupQueue } from "@/contexts/PopupQueueContext";
import { filterMatchesByDailyLimit } from "@/lib/utils/match-limit-utils";
import { MAX_MATCHES_PER_DAY } from "@/lib/match-constants";
import { createNotification } from '@/lib/notifications';
import { logger } from '@/lib/logger';

interface Top3NotificationProps {
  currentUserId: string;
}

interface LeaderboardEntry {
  user_id: string;
  player_name: string;
  points: number;
  wins: number;
  losses: number;
  matches: number;
}

export default function Top3Notification({ currentUserId }: Top3NotificationProps) {
  const previousRankRef = useRef<number | null>(null);
  const supabaseRef = useRef(createClientComponentClient());
  const channelRef = useRef<any>(null);
  const isInitialMountRef = useRef(true);
  const isCheckingRef = useRef(false);
  const checkCountRef = useRef(0);
  const { enqueuePopup } = usePopupQueue();

  // DIAGNOSTIC: Log initial du composant
  logger.info(`🔵 [Top3Notification] COMPOSANT INITIALISÉ - User ID: ${currentUserId.substring(0, 8)}…`);

  // Fonction pour récupérer le classement actuel (FILTRÉ PAR CLUB)
  // Utilise l'API qui calcule déjà les points avec boosts
  const fetchLeaderboard = useCallback(async (): Promise<LeaderboardEntry[]> => {
    try {
      logger.info("📥 [Top3Notification] Début fetchLeaderboard via API...");
      
      // Utiliser l'API leaderboard qui calcule déjà les points avec boosts
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        const leaderboard = (data.leaderboard || []).map((entry: any) => ({
          user_id: entry.user_id,
          player_name: entry.player_name || entry.name,
          points: entry.points,
          wins: entry.wins,
          losses: entry.losses,
          matches: entry.matches,
        }));
        logger.info(`📥 [Top3Notification] Leaderboard récupéré via API: ${leaderboard.length} joueurs`);
        return leaderboard;
      }
      
      logger.warn('[Top3Notification] API leaderboard failed, using fallback');
      const supabase = supabaseRef.current;
      
      try {
      
      const { data: participantsData, error: participantsError } = await supabase
        .from("match_participants")
        .select("user_id, player_type, guest_player_id, team, match_id")
        .eq("player_type", "user");

      if (participantsError) {
        logger.error("❌ [Top3Notification] Error fetching participants:", participantsError);
        return [];
      }

      logger.info("📥 [Top3Notification] Participants récupérés:", participantsData?.length || 0);

      if (!participantsData || participantsData.length === 0) {
        logger.warn("⚠️ [Top3Notification] Aucun participant trouvé");
        return [];
      }

      const uniqueMatchIds = [...new Set(participantsData.map((p: any) => p.match_id))];
      logger.info("📥 [Top3Notification] Matchs uniques:", uniqueMatchIds.length);
      
      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("id, winner_team_id, team1_id, team2_id, played_at")
        .in("id", uniqueMatchIds);

      if (matchesError) {
        logger.error("❌ [Top3Notification] Error fetching matches:", matchesError);
        return [];
      }

      logger.info("📥 [Top3Notification] Matchs récupérés:", matchesData?.length || 0);

      const matchesMap = new Map<string, { winner_team_id: string; team1_id: string; team2_id: string; played_at: string }>();
      (matchesData || []).forEach((m: any) => {
        if (m.winner_team_id && m.team1_id && m.team2_id) {
          matchesMap.set(m.id, {
            winner_team_id: m.winner_team_id,
            team1_id: m.team1_id,
            team2_id: m.team2_id,
            played_at: m.played_at || new Date().toISOString(),
          });
        }
      });

      // Filtrer les matchs selon la limite quotidienne de 2 matchs par jour
      const validMatchIdsForPoints = filterMatchesByDailyLimit(
        participantsData.filter(p => p.user_id).map(p => ({ 
          match_id: p.match_id, 
          user_id: p.user_id 
        })),
        Array.from(matchesMap.entries()).map(([id, match]) => ({ 
          id, 
          played_at: match.played_at 
        })),
        MAX_MATCHES_PER_DAY
      );

      const byPlayer: Record<string, { wins: number; losses: number; matches: number }> = {};

      participantsData.forEach((p: any) => {
        // Ignorer les matchs qui dépassent la limite quotidienne
        if (!validMatchIdsForPoints.has(p.match_id)) {
          return;
        }
        const match = matchesMap.get(p.match_id);
        if (!match) return;

        const playerId = p.user_id;
        if (!playerId) return;

        if (!byPlayer[playerId]) {
          byPlayer[playerId] = { wins: 0, losses: 0, matches: 0 };
        }

        byPlayer[playerId].matches += 1;
        const winner_team = match.winner_team_id === match.team1_id ? 1 : 2;
        const win = winner_team === p.team;

        if (win) {
          byPlayer[playerId].wins += 1;
        } else {
          byPlayer[playerId].losses += 1;
        }
      });

      const userIds = Object.keys(byPlayer);
      logger.info("📥 [Top3Notification] Joueurs uniques:", userIds.length);
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      const profilesMap = new Map<string, string>();
      if (profiles) {
        profiles.forEach((p: any) => {
          profilesMap.set(p.id, p.display_name);
        });
      }
      
      const { data: reviewers } = await supabase
        .from("reviews")
        .select("user_id")
        .in("user_id", userIds);

      const hasReview = new Set((reviewers || []).map((r: any) => r.user_id));

      const leaderboard: LeaderboardEntry[] = userIds.map((userId) => {
        const stats = byPlayer[userId];
        const bonus = hasReview.has(userId) ? 10 : 0;
        const points = stats.wins * 10 + stats.losses * 3 + bonus;
        const name = profilesMap.get(userId) || "Joueur";

        return {
          user_id: userId,
          player_name: name,
          points: points,
          wins: stats.wins,
          losses: stats.losses,
          matches: stats.matches,
        };
      });

      const sorted = leaderboard.sort((a, b) => b.points - a.points || b.wins - a.wins || a.matches - b.matches);
      
      logger.info(`📥 [Top3Notification] Leaderboard complet calculé (fallback): ${sorted.length} joueurs`);
      const top3Data = sorted.slice(0, 3).map(p => ({ name: p.player_name, points: p.points, id: p.user_id }));
      logger.info(`📥 [Top3Notification] Top 3: ${JSON.stringify(top3Data)}`);
      
      return sorted;
      } catch (fallbackError) {
        logger.error("❌ [Top3Notification] Fallback method also failed:", fallbackError);
        return [];
      }
    } catch (error) {
      logger.error("❌ [Top3Notification] Error fetching leaderboard:", error);
      return [];
    }
  }, []);

  // Fonction pour trouver le rang du joueur actuel
  const findUserRank = useCallback((leaderboard: LeaderboardEntry[]): number | null => {
    const index = leaderboard.findIndex((entry) => entry.user_id === currentUserId);
    const rank = index === -1 ? null : index + 1;
    
    if (rank !== null) {
      const player = leaderboard[index];
      logger.info("🎯 [Top3Notification] Joueur trouvé dans leaderboard:", {
        rank,
        name: player.player_name,
        points: player.points,
        user_id: player.user_id
      });
    } else {
      logger.warn("⚠️ [Top3Notification] Joueur NON trouvé dans leaderboard");
      logger.warn("⚠️ [Top3Notification] User ID recherché:", currentUserId);
      logger.warn("⚠️ [Top3Notification] User IDs dans leaderboard:", leaderboard.map(p => p.user_id));
    }
    
    return rank;
  }, [currentUserId]);

  // Vérifier les changements de position
  const checkPositionChange = useCallback(async () => {
    if (isCheckingRef.current) {
      logger.info("⏸️ [Top3Notification] Vérification déjà en cours, ignorée");
      return;
    }
    isCheckingRef.current = true;
    checkCountRef.current += 1;

    try {
      logger.info(`\n🔄 [Top3Notification] ===== VÉRIFICATION #${checkCountRef.current} =====`);
      
      const leaderboard = await fetchLeaderboard();
      const currentRank = findUserRank(leaderboard);
      const previousRank = previousRankRef.current;

      logger.info(`🎯 [Top3Notification] Rank actuel: ${currentRank} | Rank précédent: ${previousRank}`);
      logger.info(`🎯 [Top3Notification] isInitialMount: ${isInitialMountRef.current}`);
      logger.info(`🎯 [Top3Notification] 👤 User ID: ${currentUserId.substring(0, 8)}…`);

      // Ignorer le premier chargement
      if (isInitialMountRef.current) {
        logger.info("⚠️ [Top3Notification] ⚠️ INITIALISATION - Rang actuel:", currentRank);
        previousRankRef.current = currentRank;
        isInitialMountRef.current = false;
        logger.info("✅ [Top3Notification] Initialisation terminée, previousRankRef défini à:", previousRankRef.current);
        return;
      }

      // Si on n'a pas de rang précédent, on initialise
      if (previousRank === null) {
        logger.info("⚠️ [Top3Notification] Pas de rang précédent, initialisation avec:", currentRank);
        previousRankRef.current = currentRank;
        return;
      }

      // Si le rang actuel est null (hors classement), on ne fait rien
      if (currentRank === null) {
        logger.info("⚠️ [Top3Notification] Rang actuel null (hors classement)");
        previousRankRef.current = null;
        return;
      }

      // Si le rang n'a pas changé, on ne fait rien
      if (currentRank === previousRank) {
        logger.info("➡️ [Top3Notification] Rang inchangé:", currentRank);
        return;
      }

      logger.info(`🔄 [Top3Notification] 🔄 CHANGEMENT DÉTECTÉ: ${previousRank} → ${currentRank}`);
      logger.info("🔍 [Top3Notification] Vérification conditions détrônement:");
      logger.info(`  - previousRank: ${previousRank} (doit être <= 3)`);
      logger.info(`  - currentRank: ${currentRank} (doit être > previousRank)`);
      logger.info(`  - previousRank <= 3: ${previousRank <= 3}`);
      logger.info(`  - currentRank > previousRank: ${currentRank > previousRank}`);

      // Détecter les changements de rang et créer des notifications
      
      // Cas 1: Détrônement du top 3 (3 → 4+)
      if (previousRank !== null && previousRank <= 3 && currentRank > 3) {
        let notificationType: "dethroned_from_1" | "dethroned_from_2" | "dethroned_from_3" | null = null;
        
        if (previousRank === 1) {
          logger.info(`🚨🚨🚨 [Top3Notification] DÉTRÔNEMENT DE LA 1ÈRE PLACE DÉTECTÉ: ${previousRank} → ${currentRank}`);
          notificationType = "dethroned_from_1";
        } else if (previousRank === 2) {
          logger.info(`🚨🚨🚨 [Top3Notification] DÉTRÔNEMENT DE LA 2ÈME PLACE DÉTECTÉ: ${previousRank} → ${currentRank}`);
          notificationType = "dethroned_from_2";
        } else if (previousRank === 3) {
          logger.info(`🚨🚨🚨 [Top3Notification] DÉTRÔNEMENT DE LA 3ÈME PLACE DÉTECTÉ: ${previousRank} → ${currentRank}`);
          notificationType = "dethroned_from_3";
        }
        
        if (notificationType) {
          // Créer notification dans la BD
          createNotification(currentUserId, 'top3' as any, {
            type: 'dethroned',
            previous_rank: previousRank,
            current_rank: currentRank,
            notification_type: notificationType,
            timestamp: new Date().toISOString(),
          }).catch(err => logger.error('Failed to save top3 notification:', err));
          
          // Ajouter à la file d'attente des popups
          enqueuePopup({
            type: "top3",
            notificationType,
          });
        }
        previousRankRef.current = currentRank;
      }
      // Cas 2: Entrée dans le top 3 (4+ → 1/2/3)
      else if (previousRank !== null && previousRank > 3 && currentRank <= 3) {
        logger.info(`🎉 [Top3Notification] ENTRÉE DANS LE TOP 3 DÉTECTÉE: ${previousRank} → ${currentRank}`);
        // Créer notification dans la BD pour célébrer l'entrée dans le top 3
        createNotification(currentUserId, 'top3', {
          type: 'entered_top3',
          rank: currentRank,
          previous_rank: previousRank,
          timestamp: new Date().toISOString(),
        }).catch(err => logger.error('Failed to save top3 notification:', err))
        previousRankRef.current = currentRank;
      }
      // Cas 3: Changement au sein du top 3 (1→2, 2→1, etc.)
      else if (previousRank !== null && previousRank <= 3 && currentRank <= 3 && previousRank !== currentRank) {
        logger.info(`➡️ [Top3Notification] Changement de rang dans le top 3: ${previousRank} → ${currentRank}`);
        // Créer notification pour les mouvements dans le top 3
        createNotification(currentUserId, 'top3', {
          type: 'rank_changed',
          rank: currentRank,
          previous_rank: previousRank,
          timestamp: new Date().toISOString(),
        }).catch(err => logger.error('Failed to save top3 notification:', err))
        previousRankRef.current = currentRank;
      }
      // Cas 4: Autres changements
      else {
        logger.info(`➡️ [Top3Notification] Changement de rang: ${previousRank} → ${currentRank}`);
        previousRankRef.current = currentRank;
      }
      
      logger.info(`✅ [Top3Notification] ===== FIN VÉRIFICATION #${checkCountRef.current} =====\n`);
    } catch (error) {
      logger.error("❌ [Top3Notification] Error in checkPositionChange:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [fetchLeaderboard, findUserRank]);

  useEffect(() => {
    logger.info("🚀 [Top3Notification] 🚀 useEffect MONTÉ");
    logger.info("🚀 [Top3Notification] 👤 User ID:", currentUserId);
    
    const supabase = supabaseRef.current;
    let isMounted = true;
    
    // Vérification initiale immédiate
    logger.info("🚀 [Top3Notification] Déclenchement vérification initiale...");
    checkPositionChange();

    // Écouter les changements en temps réel
    // Nettoyer d'abord le channel précédent s'il existe
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      } catch (error) {
        logger.warn("⚠️ [Top3Notification] Erreur lors du nettoyage du channel précédent:", error);
      }
    }

    const channelName = `top3-notification-${currentUserId}-${Date.now()}`;
    logger.info("🚀 [Top3Notification] Création channel Realtime:", channelName);
    
    let channel: any = null;
    
    try {
      channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: currentUserId },
          },
        })
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "matches",
          },
          (payload) => {
            if (!isMounted) return;
            logger.info("🔄🔄🔄 [Top3Notification] Match détecté via Realtime, payload:", payload);
            setTimeout(() => {
              if (isMounted) {
                checkPositionChange();
              }
            }, 2000);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "match_participants",
          },
          (payload) => {
            if (!isMounted) return;
            logger.info("🔄🔄🔄 [Top3Notification] Participant détecté via Realtime, payload:", payload);
            setTimeout(() => {
              if (isMounted) {
                checkPositionChange();
              }
            }, 2000);
          }
        );

      channel.subscribe((status: string, err?: Error) => {
        if (!isMounted) return;
        logger.info(`📡 [Top3Notification] Subscription status: ${status}`);
        if (status === "SUBSCRIBED") {
          logger.info("✅✅✅ [Top3Notification] Realtime subscription ACTIVE");
        } else if (status === "CHANNEL_ERROR") {
          // Ne pas logger comme erreur, juste comme avertissement
          logger.warn("⚠️ [Top3Notification] Erreur de subscription Realtime (le polling périodique continuera)", err);
          // Le polling périodique continuera de fonctionner même si Realtime échoue
        } else if (status === "TIMED_OUT") {
          logger.warn("⏱️⏱️⏱️ [Top3Notification] Subscription timeout (le polling périodique continuera)");
        } else if (status === "CLOSED") {
          logger.warn("🚪🚪🚪 [Top3Notification] Subscription fermée");
        }
      });

      channelRef.current = channel;
    } catch (error) {
      logger.warn("⚠️ [Top3Notification] Erreur lors de la création du channel (le polling périodique continuera):", error);
      // Le polling périodique continuera de fonctionner même si Realtime échoue
    }

    // Vérifier très fréquemment (toutes les 3 secondes) pour s'assurer de détecter les changements
    const interval = setInterval(() => {
      if (isMounted) {
        logger.info("⏰ [Top3Notification] Vérification périodique déclenchée");
        checkPositionChange();
      }
    }, 3000);

    return () => {
      isMounted = false;
      logger.info("🧹 [Top3Notification] Nettoyage du composant");
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          logger.error("❌ [Top3Notification] Erreur lors du nettoyage du channel:", error);
        }
      }
      clearInterval(interval);
    };
  }, [currentUserId, checkPositionChange]);

  // Ce composant ne rend plus rien, il délègue au PopupQueueRenderer
  return null;
}
