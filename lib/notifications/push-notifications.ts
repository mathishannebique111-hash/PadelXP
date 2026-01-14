import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase/client";

export class PushNotificationsService {
    private static supabase = createClient();

    static async initialize(userId: string) {
        if (Capacitor.getPlatform() === "web") {
            console.log("[PushNotifications] Not supported on web");
            return;
        }

        try {
            // 1. Demander la permission
            const permission = await PushNotifications.requestPermissions();

            if (permission.receive === "granted") {
                // 2. S'enregistrer auprès du service natif (APNs/FCM)
                await PushNotifications.register();
            }

            // 3. Écouter l'enregistrement réussi pour obtenir le token
            PushNotifications.addListener("registration", async (token) => {
                console.log("[PushNotifications] Token reçu:", token.value);
                await this.saveToken(userId, token.value);
            });

            // 4. Écouter les erreurs
            PushNotifications.addListener("registrationError", (error) => {
                console.error("[PushNotifications] Erreur enregistrement:", error.error);
            });

            // 5. Écouter les notifications reçues (quand l'app est ouverte)
            PushNotifications.addListener("pushNotificationReceived", (notification) => {
                console.log("[PushNotifications] Notification reçue:", notification);
            });

            // 6. Écouter l'action de clic sur la notification
            PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
                console.log("[PushNotifications] Action effectuée:", notification.actionId, notification.notification);
                // Ici on pourra rediriger l'utilisateur selon les données de la notif
            });

        } catch (error) {
            console.error("[PushNotifications] Erreur initialisation:", error);
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
        } catch (error) {
            console.error("[PushNotifications] Erreur désenregistrement:", error);
        }
    }
}
