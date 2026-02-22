import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { Badge } from "@capawesome/capacitor-badge";
import { createClient } from "@/lib/supabase/client";

export class PushNotificationsService {
    private static supabase = createClient();
    private static isInitialized = false;

    static async initialize(userId: string) {
        const platform = Capacitor.getPlatform();
        console.log("[PushNotifications] initialize() called — platform:", platform, "userId:", userId, "isInitialized:", this.isInitialized);

        if (platform === "web") {
            console.log("[PushNotifications] Not supported on web, skipping.");
            return;
        }

        if (this.isInitialized) {
            console.log("[PushNotifications] Already initialized, skipping.");
            return;
        }

        try {
            // 1. Demander la permission (Android 13+ et iOS)
            console.log("[PushNotifications] Requesting permissions...");
            const permission = await PushNotifications.requestPermissions();
            console.log("[PushNotifications] Permission result:", permission.receive);

            if (permission.receive === "granted") {
                if (platform === "android") {
                    // Sur Android, PushNotifications.register() utilise FCM.
                    // Si FCM n'est pas configuré ou Google Play Services absent, ça crash.
                    // On protège avec un try/catch spécifique + timeout.
                    await this.registerAndroid(userId);
                } else {
                    // iOS – APNs est toujours disponible
                    await this.registerNative(userId);
                }
            } else {
                console.log("[PushNotifications] Permission denied or not determined:", permission.receive);
            }
        } catch (error) {
            console.error("[PushNotifications] Erreur lors de la demande de permissions:", error);
        }
    }

    /**
     * Enregistrement spécifique Android avec protection contre les crashes FCM.
     */
    private static async registerAndroid(userId: string) {
        try {
            console.log("[PushNotifications] Android: checking Google Play Services availability...");

            // On ajoute les listeners AVANT d'appeler register()
            PushNotifications.addListener("registration", async (token) => {
                console.log("[PushNotifications] Android token reçu:", token.value);
                await this.saveToken(userId, token.value);
            });

            PushNotifications.addListener("registrationError", (error) => {
                console.error("[PushNotifications] Android registrationError:", JSON.stringify(error));
            });

            // Enregistrement FCM avec garde de sécurité
            console.log("[PushNotifications] Android: calling register()...");
            await PushNotifications.register();
            this.isInitialized = true;
            console.log("[PushNotifications] Android: register() succeeded.");

            // Listeners pour notifications reçues
            this.setupNotificationListeners();
        } catch (e: any) {
            console.error("[PushNotifications] Android: register() crashed. FCM/Google Play Services issue:", e?.message || e);
            // Ne pas crasher l'app, juste loguer l'erreur
            // L'utilisateur pourra utiliser l'app normalement sans notifications
        }
    }

    private static async registerNative(userId: string) {
        try {
            console.log("[PushNotifications] iOS: setting up listeners...");

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
            console.log("[PushNotifications] iOS: calling register()...");
            await PushNotifications.register();
            this.isInitialized = true;
            console.log("[PushNotifications] iOS: register() succeeded.");

            // 5. Listeners pour notifications reçues
            this.setupNotificationListeners();
        } catch (e) {
            console.error("[PushNotifications] Erreur critique lors de l'enregistrement natif:", e);
        }
    }

    private static setupNotificationListeners() {
        // Écouter les notifications reçues (quand l'app est ouverte)
        PushNotifications.addListener("pushNotificationReceived", (notification) => {
            console.log("[PushNotifications] Notification reçue:", notification);
        });

        // Écouter l'action de clic sur la notification
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
                window.location.href = "/player/matches";
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
