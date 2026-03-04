"use client";

import { useEffect } from "react";

export default function PlayerSafeAreaColor() {
  useEffect(() => {
    // Lire la couleur de fond depuis la variable CSS du thème (supporte le branding club)
    const computedStyle = getComputedStyle(document.documentElement);
    const themePageRgb = computedStyle.getPropertyValue('--theme-player-page').trim();
    // Convertir "23 37 84" en "#172554" par exemple
    let bgColor = '#172554'; // fallback
    if (themePageRgb) {
      const parts = themePageRgb.split(/\s+/).map(Number);
      if (parts.length === 3 && parts.every(n => !isNaN(n))) {
        bgColor = `#${parts.map(n => n.toString(16).padStart(2, '0')).join('')}`;
      }
    }

    // Fonction pour notifier la vue native iOS
    const notifyNativeColor = (color: string) => {
      // Méthode 1: WKWebView message handler
      if ((window as any).webkit && (window as any).webkit.messageHandlers && (window as any).webkit.messageHandlers.updateSafeAreaColor) {
        (window as any).webkit.messageHandlers.updateSafeAreaColor.postMessage(color);
      }

      // Méthode 2: Capacitor
      if ((window as any).Capacitor && (window as any).Capacitor.Plugins) {
        try {
          // Envoyer un événement personnalisé
          const event = new CustomEvent('updateSafeAreaColor', { detail: { color } });
          window.dispatchEvent(event);
        } catch (e) {
          // Ignorer les erreurs
        }
      }
    };

    // Appliquer la couleur
    document.body.style.backgroundColor = bgColor;
    document.documentElement.style.backgroundColor = bgColor;
    document.body.setAttribute('data-player-layout', 'true');
    document.documentElement.setAttribute('data-player-layout', 'true');

    // Notifier la vue native immédiatement et plusieurs fois
    notifyNativeColor(bgColor);
    const timeouts = [
      setTimeout(() => notifyNativeColor(bgColor), 50),
      setTimeout(() => notifyNativeColor(bgColor), 100),
      setTimeout(() => notifyNativeColor(bgColor), 200),
      setTimeout(() => notifyNativeColor(bgColor), 500),
      setTimeout(() => notifyNativeColor(bgColor), 1000),
    ];

    // Nettoyer lors du démontage
    return () => {
      timeouts.forEach(clearTimeout);
      const blackColor = '#000';
      document.body.style.backgroundColor = blackColor;
      document.documentElement.style.backgroundColor = blackColor;
      document.body.removeAttribute('data-player-layout');
      document.documentElement.removeAttribute('data-player-layout');
      notifyNativeColor(blackColor);
    };
  }, []);

  return null;
}

