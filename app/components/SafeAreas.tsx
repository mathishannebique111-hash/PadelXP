'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';

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
      '/player/onboarding'
    ];

    const isApp = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
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
    } else if (pathname?.startsWith('/attenteandroid')) {
      topColor = '#071554';
      bottomColor = '#071554';
    } else if (isPlayerPage) {
      topColor = '#172554';
      bottomColor = '#172554';
    }

    const forceSafeAreaColor = async () => {
      if (typeof window === 'undefined' || !isApp) return;

      try {
        // 1. Gestion iOS (Message natif pour le plugin Swift personnalisé)
        if (platform === 'ios') {
          const win = window as any;
          if (win.webkit && win.webkit.messageHandlers && win.webkit.messageHandlers.updateSafeAreaColor) {
            win.webkit.messageHandlers.updateSafeAreaColor.postMessage(topColor);
          }
        }

        // 2. Gestion Android (API Capacitor Standard)
        if (platform === 'android') {
          // Barre de statut (Haut)
          if (StatusBar) {
            await StatusBar.setBackgroundColor({ color: topColor });
            await StatusBar.setStyle({ style: isBlackPage ? Style.Dark : Style.Light });
          }
          // Barre de navigation (Bas)
          if (NavigationBar) {
            await NavigationBar.setNavigationBarColor({ color: bottomColor });
          }
        }
      } catch (e) {
        console.error("[SafeAreas] Error updating native colors:", e);
      }

      // Assurer une marge de sécurité minimale pour l'app
      if (document.documentElement.classList.contains('is-app')) {
        document.documentElement.style.setProperty('--sat', '65px', 'important');
      }
    };

    forceSafeAreaColor();
    const timer = setTimeout(forceSafeAreaColor, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
