import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { Badge } from "@capawesome/capacitor-badge";
import { createClient } from "@/lib/supabase/client";

export class PushNotificationsService {
    private static supabase = createClient();
    private static isInitialized = false;

    static async initialize(userId: string) {
        if (Capacitor.getPlatform() === "web") {
            console.log("[PushNotifications] Not supported on web");
            return;
        }

        if (this.isInitialized) {
            console.log("[PushNotifications] Already initialized");
            return;
        }

        try {
            // 1. Demander la permission (Android 13+ et iOS)
            const permission = await PushNotifications.requestPermissions();

            if (permission.receive === "granted") {
                // Vérifier si nous sommes sur Android pour s'assurer que c'est sécurisé
                // Dans certains cas, appeler register sans google-services.json peut crash
                await this.registerNative(userId);
            }
        } catch (error) {
            console.error("[PushNotifications] Erreur lors de la demande de permissions:", error);
        }
    }

    private static async registerNative(userId: string) {
        try {
            // 2. Écouter l'enregistrement réussi AVANT d'appeler register
            PushNotifications.addListener("registration", async (token) => {
                console.log("[PushNotifications] Token reçu:", token.value);
                await this.saveToken(userId, token.value);
            });

            // 3. Écouter les erreurs
            PushNotifications.addListener("registrationError", (error) => {
                console.error("[PushNotifications] Erreur enregistrement natif:", error.error);
            });

            // 4. S'enregistrer auprès du service natif (APNs/FCM)
            await PushNotifications.register();
            this.isInitialized = true;

            // 5. Écouter les notifications reçues (quand l'app est ouverte)
            PushNotifications.addListener("pushNotificationReceived", (notification) => {
                console.log("[PushNotifications] Notification reçue:", notification);
            });

            // 6. Écouter l'action de clic sur la notification
            PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
                console.log("[PushNotifications] Action effectuée:", notification.actionId, notification.notification);

                const data = notification.notification.data;
                if (!data) return;

                // Redirection basée sur le contenu de la data
                // Invitations de joueurs
                if (data.invitation_id || (data.type && data.type.includes("match_invitation"))) {
                    window.location.href = "/player/partners";
                }
                // Défis d'équipe
                else if (data.challenge_id || (data.type && data.type.includes("team_challenge"))) {
                    window.location.href = "/player/matches"; // Ou l'onglet spécifique des défis
                }
                // Demandes de partenariat
                else if (data.partnership_id || (data.type && data.type.includes("partnership"))) {
                    window.location.href = "/player/partners";
                }
                // Badges / Niveaux
                else if (data.badge_id || (data.type && data.type.includes("badge"))) {
                    window.location.href = "/player/profile";
                }
                // Match validé -> Historique
                else if (data.match_id) {
                    window.location.href = "/player/history";
                }
            });
        } catch (e) {
            console.error("[PushNotifications] Erreur critique lors de l'enregistrement natif (Vérifiez google-services.json):", e);
        }
    }

    private static async saveToken(userId: string, token: string) {
        try {
            const platform = Capacitor.getPlatform();

            const { error } = await this.supabase
                .from("push_tokens")
                .upsert(
                    {
                        user_id: userId,
                        token: token,
                        platform: platform
                    },
                    { onConflict: "user_id, token" }
                );

            if (error) throw error;
            console.log("[PushNotifications] Token sauvegardé avec succès");
        } catch (error) {
            console.error("[PushNotifications] Erreur sauvegarde token:", error);
        }
    }

    static async unregister() {
        if (Capacitor.getPlatform() === "web") return;

        try {
            await PushNotifications.removeAllListeners();
            this.isInitialized = false;
        } catch (error) {
            console.error("[PushNotifications] Erreur désenregistrement:", error);
        }
    }

    static async setBadge(count: number) {
        if (Capacitor.getPlatform() === "web") return;
        try {
            await Badge.set({ count });
        } catch (error) {
            console.error("[PushNotifications] Erreur setBadge:", error);
        }
    }

    static async clearBadge() {
        if (Capacitor.getPlatform() === "web") return;
        try {
            await PushNotifications.removeAllDeliveredNotifications();
            await Badge.clear();
        } catch (error) {
            console.error("[PushNotifications] Erreur nettoyage badge:", error);
        }
    }
}
