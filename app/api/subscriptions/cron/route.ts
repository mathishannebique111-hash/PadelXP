import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  handleTrialEnd,
  shouldSendTrialReminder,
  getClubSubscriptionById,
} from "@/lib/utils/subscription-utils";

/**
 * Cron job pour gérer les transitions automatiques d'abonnements
 * - Fin d'essai
 * - Rappels d'essai (J-10, J-3, J-1)
 * - Renouvellements
 * - Période de grâce
 * 
 * À appeler via un cron externe (Vercel Cron, GitHub Actions, etc.)
 * Exemple: https://yourdomain.com/api/subscriptions/cron?secret=YOUR_SECRET
 */
export async function GET(req: Request) {
  try {
    // Vérifier le secret (protection basique)
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const expectedSecret = process.env.SUBSCRIPTION_CRON_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const results = {
      trialEndsProcessed: 0,
      remindersSent: 0,
      errors: [] as string[],
    };

    // 1. Récupérer tous les abonnements en essai qui se terminent aujourd'hui
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: endingTrials, error: trialsError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("status", "trialing")
      .gte("trial_end_at", today.toISOString())
      .lt("trial_end_at", tomorrow.toISOString());

    if (trialsError) {
      console.error("[cron] Error fetching ending trials:", trialsError);
      results.errors.push(`Erreur lors de la récupération des essais: ${trialsError.message}`);
    } else if (endingTrials) {
      // Traiter chaque essai qui se termine
      for (const trial of endingTrials) {
        try {
          const success = await handleTrialEnd(trial.id);
          if (success) {
            results.trialEndsProcessed++;
          }
        } catch (error: any) {
          console.error(`[cron] Error handling trial end for ${trial.id}:`, error);
          results.errors.push(`Erreur pour l'abonnement ${trial.id}: ${error.message}`);
        }
      }
    }

    // 2. Récupérer tous les abonnements en essai pour les rappels
    const { data: allTrials, error: allTrialsError } = await supabase
      .from("subscriptions")
      .select("id, trial_end_at")
      .eq("status", "trialing")
      .not("trial_end_at", "is", null);

    if (allTrialsError) {
      console.error("[cron] Error fetching all trials:", allTrialsError);
      results.errors.push(`Erreur lors de la récupération des essais: ${allTrialsError.message}`);
    } else if (allTrials) {
      // Vérifier les rappels J-10, J-3, J-1
      for (const trial of allTrials) {
        try {
          const subscription = await getClubSubscriptionById(trial.id);
          if (!subscription) continue;

          // Vérifier si un rappel doit être envoyé
          const reminders = [10, 3, 1];
          for (const daysBefore of reminders) {
            if (shouldSendTrialReminder(subscription, daysBefore)) {
              // TODO: Envoyer l'email de rappel
              // await sendTrialReminderEmail(subscription, daysBefore);
              results.remindersSent++;
            }
          }
        } catch (error: any) {
          console.error(`[cron] Error checking reminders for ${trial.id}:`, error);
          results.errors.push(`Erreur rappel pour ${trial.id}: ${error.message}`);
        }
      }
    }

    // 3. Traiter les renouvellements (abonnements actifs qui arrivent à échéance)
    // TODO: Implémenter la logique de renouvellement

    // 4. Traiter la période de grâce (paused -> canceled après 7 jours)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: pausedSubscriptions, error: pausedError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("status", "paused")
      .not("grace_until", "is", null)
      .lt("grace_until", now.toISOString());

    if (pausedError) {
      console.error("[cron] Error fetching paused subscriptions:", pausedError);
      results.errors.push(`Erreur lors de la récupération des abonnements en pause: ${pausedError.message}`);
    } else if (pausedSubscriptions) {
      // Passer en canceled si la période de grâce est expirée
      for (const sub of pausedSubscriptions) {
        try {
          // TODO: Implémenter la transition paused -> canceled
          // await transitionSubscriptionStatus(sub.id, 'canceled', 'system');
        } catch (error: any) {
          console.error(`[cron] Error transitioning ${sub.id} to canceled:`, error);
          results.errors.push(`Erreur transition ${sub.id}: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    });
  } catch (error: any) {
    console.error("[cron] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

