'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function SafeAreas() {
  const pathname = usePathname();

  useEffect(() => {
    // Pages où les Safe Areas DOIVENT être noires
    const blackPages = [
      '/',
      '/player/login',
      '/player/signup',
      '/login',
      '/clubs/login',
      '/clubs/signup',
    ];

    const isPlayerPage = document.documentElement.classList.contains('player-page');
    const isBlackPage = pathname && (blackPages.some(page => pathname.startsWith(page)) ||
      pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/register'));

    // Couleur de fond par défaut (Bleu Player)
    let topColor = '#172554';
    let bottomColor = '#172554';

    if (isBlackPage) {
      topColor = '#000000';
      bottomColor = '#000000';
    } else if (isPlayerPage) {
      topColor = '#172554';
      bottomColor = '#172554';
    }

    const forceSafeAreaColor = () => {
      if (typeof window === 'undefined') return;

      const notifyNativeColor = (color: string) => {
        try {
          const win = window as any;
          if (win.webkit && win.webkit.messageHandlers && win.webkit.messageHandlers.updateSafeAreaColor) {
            win.webkit.messageHandlers.updateSafeAreaColor.postMessage(color);
          }
        } catch (e) { }
      };

      notifyNativeColor(topColor);

      // Assurer une marge de sécurité minimale pour l'app
      if (document.documentElement.classList.contains('is-app')) {
        document.documentElement.style.setProperty('--sat', '65px', 'important');
      }

      // Nettoyer les anciens éléments s'ils existent (on ne veut plus d'overlays DOM)
      const topEl = document.getElementById('safe-area-top');
      const bottomEl = document.getElementById('safe-area-bottom');
      if (topEl) topEl.remove();
      if (bottomEl) bottomEl.remove();
    };

    // Forcer immédiatement
    forceSafeAreaColor();

    // Boucle de rafraîchissement pendant la navigation/chargement
    const interval = setInterval(forceSafeAreaColor, 500);

    // Observer les changements de classe ou de style sur le body
    const observer = new MutationObserver(forceSafeAreaColor);

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    }

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [pathname]);

  return null;
}
