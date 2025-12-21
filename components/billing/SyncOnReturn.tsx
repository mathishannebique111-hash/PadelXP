"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { logger } from '@/lib/logger';

function SyncOnReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const sync = searchParams.get("sync");
    const subscriptionUpdated = searchParams.get("subscription_updated");
    
    // Si subscription_updated=true, rafraîchir directement la page
    if (subscriptionUpdated === "true" && !synced && !syncing) {
      setSyncing(true);
      
      // Retirer le paramètre de l'URL et rafraîchir
      setTimeout(() => {
        const newUrl = window.location.pathname;
        router.replace(newUrl);
        router.refresh();
        setSynced(true);
        setSyncing(false);
      }, 500);
      return;
    }
    
    if (sync === "1" && !synced && !syncing) {
      setSyncing(true);
      
      // Synchroniser l'abonnement depuis Stripe
      const syncSubscription = async () => {
        try {
          const response = await fetch("/api/stripe/sync-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          const data = await response.json();
          
          if (response.ok) {
            logger.info("[SyncOnReturn] Subscription synchronized successfully");
            setSynced(true);
            
            // Retirer le paramètre sync de l'URL et rafraîchir
            const newUrl = window.location.pathname;
            router.replace(newUrl);
            router.refresh();
          } else {
            logger.error("[SyncOnReturn] Sync error:", data.error);
          }
        } catch (error) {
          logger.error("[SyncOnReturn] Unexpected error:", error);
        } finally {
          setSyncing(false);
        }
      };

      // Attendre un court délai pour s'assurer que la page est chargée
      setTimeout(() => {
        syncSubscription();
      }, 500);
    }
  }, [searchParams, router, synced, syncing]);

  if (syncing) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-blue-500/20 border border-blue-400/50 rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-transparent"></div>
        <span className="text-sm text-blue-300">Synchronisation de l'abonnement...</span>
      </div>
    );
  }

  return null;
}

export default function SyncOnReturn() {
  return (
    <Suspense fallback={null}>
      <SyncOnReturnContent />
    </Suspense>
  );
}

