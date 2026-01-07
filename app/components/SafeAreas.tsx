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

    const isBlackPage = blackPages.includes(pathname);
    const isPlayerPage = document.body?.classList.contains('player-page');
    
    // Couleurs différentes pour haut et bas
    const topColor = isBlackPage ? '#000000' : (isPlayerPage ? '#0B1C45' : '#000000');
    const bottomColor = '#000000'; // Toujours noir pour le bas

    const forceSafeAreaColor = (topColor: string, bottomColor: string) => {
      if (typeof window === 'undefined') return;

      // Notifier le code natif iOS avec la couleur du haut (pour les vues natives)
      try {
        if (window.webkit && (window.webkit as any).messageHandlers && (window.webkit as any).messageHandlers.updateSafeAreaColor) {
          (window.webkit as any).messageHandlers.updateSafeAreaColor.postMessage(topColor);
        }
      } catch(e) {
        console.error('Error notifying native:', e);
      }

      const createOrUpdate = (id: string, position: 'top' | 'bottom', color: string) => {
        let element = document.getElementById(id);
        
        if (!element) {
          element = document.createElement('div');
          element.id = id;
          document.body.appendChild(element);
        }
        
        // Forcer avec !important via setProperty
        element.style.setProperty('position', 'fixed', 'important');
        element.style.setProperty('left', '0', 'important');
        element.style.setProperty('right', '0', 'important');
        element.style.setProperty('z-index', '9999', 'important');
        element.style.setProperty('pointer-events', 'none', 'important');
        element.style.setProperty('background-color', color, 'important');
        
        if (position === 'top') {
          element.style.setProperty('top', '0', 'important');
          element.style.setProperty('height', 'env(safe-area-inset-top, 0px)', 'important');
        } else {
          element.style.setProperty('bottom', '0', 'important');
          element.style.setProperty('height', 'env(safe-area-inset-bottom, 0px)', 'important');
        }
      };

      createOrUpdate('safe-area-top', 'top', topColor);
      createOrUpdate('safe-area-bottom', 'bottom', bottomColor);
    };

    // Forcer immédiatement
    forceSafeAreaColor(topColor, bottomColor);

    // Forcer plusieurs fois pour s'assurer
    const timeouts = [
      setTimeout(() => forceSafeAreaColor(topColor, bottomColor), 0),
      setTimeout(() => forceSafeAreaColor(topColor, bottomColor), 50),
      setTimeout(() => forceSafeAreaColor(topColor, bottomColor), 100),
      setTimeout(() => forceSafeAreaColor(topColor, bottomColor), 200),
      setTimeout(() => forceSafeAreaColor(topColor, bottomColor), 500),
      setTimeout(() => forceSafeAreaColor(topColor, bottomColor), 1000),
    ];

    // Observer les changements de classe du body
    const observer = new MutationObserver(() => {
      const newIsPlayerPage = document.body?.classList.contains('player-page');
      const newTopColor = isBlackPage ? '#000000' : (newIsPlayerPage ? '#0B1C45' : '#000000');
      const newBottomColor = '#000000';
      forceSafeAreaColor(newTopColor, newBottomColor);
    });

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    return () => {
      observer.disconnect();
      timeouts.forEach(clearTimeout);
    };
  }, [pathname]);

  return null;
}

