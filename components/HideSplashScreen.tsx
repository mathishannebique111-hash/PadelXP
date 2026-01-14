'use client';

import { useEffect } from 'react';

/**
 * Cache le splash screen natif quand la page est prête.
 * Envoie un message au bridge Swift pour cacher l'overlay natif.
 */
export default function HideSplashScreen() {
    useEffect(() => {
        const hide = () => {
            if (typeof window !== 'undefined') {
                // Cacher le splash natif Swift via WebKit message handler
                if ((window as any).webkit?.messageHandlers?.hideSplash) {
                    (window as any).webkit.messageHandlers.hideSplash.postMessage('hide');
                }

                // Backup: cacher aussi le splash Capacitor si présent
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
