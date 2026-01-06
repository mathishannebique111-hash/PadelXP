"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface SubscriptionStatusAutoRefreshProps {
  clubId: string;
  refreshInterval?: number; // Intervalle en millisecondes (défaut: 5 secondes)
}

export default function SubscriptionStatusAutoRefresh({
  clubId,
  refreshInterval = 5000, // 5 secondes par défaut
}: SubscriptionStatusAutoRefreshProps) {
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!clubId) return;

    // Fonction pour vérifier le statut de l'abonnement
    const checkSubscriptionStatus = async () => {
      try {
        // Utiliser l'API publique du club ou récupérer directement depuis Supabase
        // On utilise une route API simple qui retourne juste le statut
        const response = await fetch(`/api/clubs/subscription-status?club_id=${clubId}&t=${Date.now()}`, {
          cache: 'no-store',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          
          // Créer une clé unique pour le statut actuel
          const currentStatus = JSON.stringify({
            subscription_status: data?.subscription_status,
            trial_end_date: data?.trial_end_date,
            trial_current_end_date: data?.trial_current_end_date,
            selected_plan: data?.selected_plan,
            subscription_started_at: data?.subscription_started_at,
          });

          // Si le statut a changé, rafraîchir la page
          if (lastStatusRef.current !== null && lastStatusRef.current !== currentStatus) {
            console.log('[SubscriptionStatusAutoRefresh] Statut changé, rafraîchissement de la page...');
            router.refresh();
          }

          lastStatusRef.current = currentStatus;
        }
      } catch (error) {
        console.error('[SubscriptionStatusAutoRefresh] Erreur lors de la vérification:', error);
      }
    };

    // Vérifier immédiatement au montage
    checkSubscriptionStatus();

    // Puis vérifier périodiquement
    intervalRef.current = setInterval(checkSubscriptionStatus, refreshInterval);

    // Nettoyer l'intervalle au démontage
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [clubId, refreshInterval, router]);

  // Ce composant ne rend rien visuellement
  return null;
}

