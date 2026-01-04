'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface LeaderboardAutoRefreshProps {
  children: React.ReactNode;
}

/**
 * Composant client qui écoute les événements de match soumis
 * et recharge automatiquement la page pour mettre à jour le classement
 */
export default function LeaderboardAutoRefresh({ children }: LeaderboardAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const handleMatchSubmitted = () => {
      logger.info('[LeaderboardAutoRefresh] Match submitted event received, refreshing page...');
      // Recharger la page pour mettre à jour les données serveur
      router.refresh();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'matchSubmitted' && e.newValue === 'true') {
        logger.info('[LeaderboardAutoRefresh] Match submitted flag detected in localStorage, refreshing page...');
        router.refresh();
        // Nettoyer le flag après utilisation
        localStorage.removeItem('matchSubmitted');
      }
    };

    // Vérifier si le flag est déjà présent au montage (même onglet)
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('matchSubmitted') === 'true') {
        logger.info('[LeaderboardAutoRefresh] Match submitted flag found on mount, refreshing page...');
        setTimeout(() => {
          router.refresh();
          localStorage.removeItem('matchSubmitted');
        }, 500);
      }

      // Écouter les événements personnalisés (même onglet)
      window.addEventListener('matchSubmitted', handleMatchSubmitted);
      
      // Écouter les changements de localStorage (cross-tab)
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('matchSubmitted', handleMatchSubmitted);
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [router]);

  return <>{children}</>;
}

