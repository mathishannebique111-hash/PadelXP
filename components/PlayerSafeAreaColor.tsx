"use client";

import { useEffect } from "react";

export default function PlayerSafeAreaColor() {
  useEffect(() => {
    const blueColor = '#172554';
    
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
    document.body.style.backgroundColor = blueColor;
    document.documentElement.style.backgroundColor = blueColor;
    document.body.setAttribute('data-player-layout', 'true');
    document.documentElement.setAttribute('data-player-layout', 'true');
    
    // Notifier la vue native immédiatement et plusieurs fois
    notifyNativeColor(blueColor);
    const timeouts = [
      setTimeout(() => notifyNativeColor(blueColor), 50),
      setTimeout(() => notifyNativeColor(blueColor), 100),
      setTimeout(() => notifyNativeColor(blueColor), 200),
      setTimeout(() => notifyNativeColor(blueColor), 500),
      setTimeout(() => notifyNativeColor(blueColor), 1000),
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

