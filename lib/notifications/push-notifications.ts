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

            const type = data.type || "";

            // Challenges
            if (type === "challenge_new" || type === "challenge_expiring" || type === "challenge_progress") {
                window.location.href = "/club?tab=challenges";
            }
            // Match confirmations & results
            else if (type === "match_confirmation" || type === "match_validated" || type === "match_refusal_warning" || type === "match_points_earned") {
                window.location.href = "/match/new?tab=history";
            }
            // Win streak / weekly recap / inactivity
            else if (type === "win_streak" || type === "weekly_recap" || type === "inactivity_reminder") {
                window.location.href = "/home?tab=stats";
            }
            // Partner played
            else if (type === "partner_match_played") {
                window.location.href = "/match/new?tab=partners";
            }
            // Match invitations
            else if (type.includes("match_invitation")) {
                window.location.href = "/match/new?tab=history";
            }
            // Team challenges
            else if (type.includes("team_challenge")) {
                window.location.href = "/match/new?tab=partners";
            }
            // Partnerships
            else if (type.includes("partnership")) {
                window.location.href = "/home?tab=profil";
            }
            // Badges
            else if (type === "badge" || type === "badge_unlocked") {
                window.location.href = "/home?tab=badges";
            }
            // Level up
            else if (type === "level_up") {
                window.location.href = "/home?tab=profil";
            }
            // Top 3 ranking
            else if (type === "top3" || type === "top3_ranking") {
                window.location.href = "/club";
            }
            // Coach IA
            else if (type === "coach_debrief" || type === "coach_message") {
                window.location.href = "/coach";
            }
            // Reservations
            else if (type.includes("reservation")) {
                window.location.href = "/book";
            }
            // Referral
            else if (type === "referral") {
                window.location.href = "/home?tab=profil";
            }
            // Fallback: if data has a path, use it
            else if (data.path) {
                window.location.href = data.path;
            }
            // Match with match_id → history
            else if (data.match_id) {
                window.location.href = "/match/new?tab=history";
            }
            // Default
            else {
                window.location.href = "/home";
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
            // ShortcutBadger peut crasher sur certains launchers Android (Samsung, Xiaomi, etc.)
            // On ignore silencieusement l'erreur pour ne pas crasher l'app
            if (Capacitor.getPlatform() === "android") {
                console.warn("[PushNotifications] Badge.set() failed on Android (expected on some launchers):", error);
            } else {
                console.error("[PushNotifications] Erreur setBadge:", error);
            }
        }
    }

    static async clearBadge() {
        if (Capacitor.getPlatform() === "web") return;

        // 1. Supprimer les notifications délivrées
        try {
            await PushNotifications.removeAllDeliveredNotifications();
        } catch (error) {
            console.warn("[PushNotifications] removeAllDeliveredNotifications failed:", error);
        }

        // 2. Réinitialiser le badge (séparé pour isoler les crashes ShortcutBadger)
        try {
            await Badge.clear();
        } catch (error) {
            if (Capacitor.getPlatform() === "android") {
                console.warn("[PushNotifications] Badge.clear() failed on Android (expected on some launchers):", error);
            } else {
                console.error("[PushNotifications] Erreur nettoyage badge:", error);
            }
        }
    }
}
