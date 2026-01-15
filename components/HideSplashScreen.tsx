'use client';

import { useEffect } from 'react';

/**
 * Cache le splash screen natif et le CSS overlay quand la page est prête.
 * Envoie un message au bridge Swift pour cacher l'overlay natif.
 */
export default function HideSplashScreen() {
    useEffect(() => {
        const hide = () => {
            if (typeof window !== 'undefined') {
                // 1. Cacher le CSS splash overlay avec une animation
                const cssOverlay = document.getElementById('css-splash-overlay');
                if (cssOverlay && cssOverlay.parentNode) {
                    cssOverlay.style.opacity = '0';
                    cssOverlay.style.pointerEvents = 'none';
                    // Supprimer l'overlay après l'animation
                    setTimeout(() => {
                        try {
                            // Vérifier que l'overlay existe toujours et est dans le DOM
                            if (cssOverlay && cssOverlay.parentNode) {
                                cssOverlay.remove();
                            }
                        } catch (e) {
                            // Ignorer les erreurs si l'élément a déjà été supprimé
                        }
                    }, 300);
                }

                // 2. Cacher le splash natif Swift via WebKit message handler
                if ((window as any).webkit?.messageHandlers?.hideSplash) {
                    (window as any).webkit.messageHandlers.hideSplash.postMessage('hide');
                }

                // 3. Backup: cacher aussi le splash Capacitor si présent
                const Capacitor = (window as any).Capacitor;
                if (Capacitor?.Plugins?.SplashScreen) {
                    try {
                        Capacitor.Plugins.SplashScreen.hide();
                    } catch (e) {
                        // Ignore
                    }
                }
            }
        };

        // Petit délai pour s'assurer que le rendu est fait
        const timer = setTimeout(hide, 100);
        return () => clearTimeout(timer);
    }, []);

    return null;
}
