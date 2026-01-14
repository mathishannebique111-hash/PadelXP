"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { usePopupQueue } from "@/contexts/PopupQueueContext";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Composant global qui écoute les événements de badges et de niveau
 * pour afficher les popups immédiatement après un match ou un événement.
 * À placer dans le layout protégé pour qu'il soit toujours actif.
 */
export default function GlobalNotificationListener() {
    const { user } = useUser();
    const { enqueuePopup } = usePopupQueue();
    const lastCheckedRef = useRef<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        if (!user?.id) return;

        // Éviter les vérifications multiples pour le même utilisateur
        if (lastCheckedRef.current === user.id) return;
        lastCheckedRef.current = user.id;

        // Fonction pour vérifier les nouveaux badges
        const checkNewBadges = async () => {
            try {
                // Récupérer les badges récemment débloqués (dernières 24h) qui n'ont pas été notifiés
                const { data: notifications, error } = await supabase
                    .from("notifications")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("type", "badge_unlocked")
                    .eq("is_read", false)
                    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                    .order("created_at", { ascending: true });

                if (error) {
                    logger.error("[GlobalNotificationListener] Error fetching badge notifications:", error);
                    return;
                }

                if (notifications && notifications.length > 0) {
                    for (const notif of notifications) {
                        const data = notif.data as Record<string, any>;
                        if (data?.badge_name && data?.badge_icon) {
                            enqueuePopup({
                                type: "badge",
                                icon: data.badge_icon,
                                title: data.badge_name,
                                description: data.badge_description || "",
                                badgeId: `${data.badge_icon}|${data.badge_name}`,
                            });
                        }
                    }
                }
            } catch (err) {
                logger.error("[GlobalNotificationListener] Error checking badges:", err);
            }
        };

        // Fonction pour vérifier les montées de niveau
        const checkLevelUp = async () => {
            try {
                // Récupérer les notifications de niveau récentes non lues
                const { data: notifications, error } = await supabase
                    .from("notifications")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("type", "level_up")
                    .eq("is_read", false)
                    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                    .order("created_at", { ascending: true });

                if (error) {
                    logger.error("[GlobalNotificationListener] Error fetching level notifications:", error);
                    return;
                }

                if (notifications && notifications.length > 0) {
                    for (const notif of notifications) {
                        const data = notif.data as Record<string, any>;
                        if (data?.tier) {
                            enqueuePopup({
                                type: "level_up",
                                tier: data.tier,
                                previousTier: data.previous_tier,
                            });
                        }
                    }
                }
            } catch (err) {
                logger.error("[GlobalNotificationListener] Error checking level:", err);
            }
        };

        // Vérifier au chargement
        checkNewBadges();
        checkLevelUp();

        // Écouter les nouvelles notifications en temps réel
        const channel = supabase
            .channel(`user-notifications-${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const notification = payload.new as any;

                    if (notification.type === "badge_unlocked") {
                        const data = notification.data as Record<string, any>;
                        if (data?.badge_name && data?.badge_icon) {
                            enqueuePopup({
                                type: "badge",
                                icon: data.badge_icon,
                                title: data.badge_name,
                                description: data.badge_description || "",
                                badgeId: `${data.badge_icon}|${data.badge_name}`,
                            });
                        }
                    } else if (notification.type === "level_up") {
                        const data = notification.data as Record<string, any>;
                        if (data?.tier) {
                            enqueuePopup({
                                type: "level_up",
                                tier: data.tier,
                                previousTier: data.previous_tier,
                            });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, enqueuePopup, supabase]);

    return null;
}
