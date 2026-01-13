'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import "./globals.css";
import CookieConsent from "@/components/cookies/CookieConsent";
import SafeAreas from './components/SafeAreas';




// Metadata déplacée dans le composant car 'use client' ne permet pas export const metadata




export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Ne pas rediriger si on est déjà sur sign-up ou login
    if (pathname === '/sign-up' || pathname === '/login') {
      return;
    }

    const hasLaunched = localStorage.getItem('hasLaunched');
    
    if (hasLaunched === null) {
      // Première fois
      localStorage.setItem('hasLaunched', 'true');
      router.push('/sign-up');
    } else {
      // Déjà lancé
      router.push('/login');
    }
  }, [router, pathname]);

  return (
    <html lang="fr" className="bg-black" suppressHydrationWarning>
      <head>
        <title>PadelXP</title>
        <meta name="description" content="Leaderboards, rangs, badges et ligues pour complexes de padel" />
        <link rel="icon" href="/images/flavicon.png" />
        <link rel="shortcut icon" href="/images/flavicon.png" />
        <link rel="apple-touch-icon" href="/images/flavicon.png" />
        <meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Style inline pour forcer la couleur de fond et éviter les Safe Areas blanches */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #000000 !important;
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100vh;
                overflow-x: hidden;
              }
              
              /* Pages joueurs (dashboard, profil, matchs) */
              html.player-page, body.player-page {
                background-color: #0B1C45 !important;
              }
              
              /* Landing, inscription, connexion : noir par défaut (pas de classe nécessaire) */
            `,
          }}
        />

        {/* Script pour forcer la couleur NOIRE des Safe Areas AVANT l'hydratation React */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function notifyNativeColor(color) {
                  try {
                    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.updateSafeAreaColor) {
                      window.webkit.messageHandlers.updateSafeAreaColor.postMessage(color);
                    }
                  } catch(e) {
                    console.error('Error notifying native:', e);
                  }
                }
                
                function forceBlackSafeAreas() {
                  const blackColor = '#000000';
                  
                  // Notifier le code natif iOS
                  notifyNativeColor(blackColor);
                  
                  function createOrUpdate(id, position) {
                    let el = document.getElementById(id);
                    if (!el) {
                      el = document.createElement('div');
                      el.id = id;
                      document.body.appendChild(el);
                    }
                    el.style.setProperty('position', 'fixed', 'important');
                    el.style.setProperty('left', '0', 'important');
                    el.style.setProperty('right', '0', 'important');
                    el.style.setProperty('z-index', '9999', 'important');
                    el.style.setProperty('pointer-events', 'none', 'important');
                    el.style.setProperty('background-color', blackColor, 'important');
                    if (position === 'top') {
                      el.style.setProperty('top', '0', 'important');
                      el.style.setProperty('height', 'env(safe-area-inset-top, 0px)', 'important');
                    } else {
                      el.style.setProperty('bottom', '0', 'important');
                      el.style.setProperty('height', 'env(safe-area-inset-bottom, 0px)', 'important');
                    }
                  }
                  
                  if (document.body) {
                    createOrUpdate('safe-area-top', 'top');
                    createOrUpdate('safe-area-bottom', 'bottom');
                  }
                }
                
                // Exécuter immédiatement si body existe
                if (document.body) {
                  forceBlackSafeAreas();
                } else {
                  document.addEventListener('DOMContentLoaded', forceBlackSafeAreas);
                }
                
                // Forcer plusieurs fois
                setTimeout(forceBlackSafeAreas, 0);
                setTimeout(forceBlackSafeAreas, 10);
                setTimeout(forceBlackSafeAreas, 50);
                setTimeout(forceBlackSafeAreas, 100);
                setTimeout(forceBlackSafeAreas, 200);
                setTimeout(forceBlackSafeAreas, 500);
                setTimeout(forceBlackSafeAreas, 1000);
              })();
            `,
          }}
        />

        {/* Script de détection app/web et gestion de la safe area */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const userAgent = navigator.userAgent.toLowerCase();
                if (userAgent.includes('padelxpcapacitor')) {
                  document.documentElement.classList.add('is-app');
                } else {
                  document.documentElement.classList.add('is-web');
                }
                
                // Par défaut, safe area noire (sera remplacée par bleu sur les pages joueur)
                const blackColor = '#000';
                document.body.style.backgroundColor = blackColor;
                document.documentElement.style.backgroundColor = blackColor;
                
                // Notifier la vue native iOS pour mettre à jour la couleur des safe areas en noir
                function notifyNativeColor(color) {
                  try {
                    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.updateSafeAreaColor) {
                      window.webkit.messageHandlers.updateSafeAreaColor.postMessage(color);
                    }
                  } catch(e) {
                    console.error('Error notifying native color:', e);
                  }
                }
                
                // Notifier immédiatement et plusieurs fois
                notifyNativeColor(blackColor);
                setTimeout(function() { notifyNativeColor(blackColor); }, 100);
                setTimeout(function() { notifyNativeColor(blackColor); }, 500);
                setTimeout(function() { notifyNativeColor(blackColor); }, 1000);
              })();
            `,
          }}
        />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Preload hero racket image for better LCP */}
        <link rel="preload" as="image" href="/images/padel-racket.jpg" />
        {/* Script critique pour forcer l'affichage du menu hamburger et du logo AVANT l'hydratation React */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Injecter les styles critiques immédiatement
                var criticalStyle = document.createElement('style');
                criticalStyle.id = 'critical-player-nav-styles';
                criticalStyle.textContent = \`
                  [data-hamburger-button] {
                    position: fixed !important;
                    top: calc(0.75rem + constant(safe-area-inset-top)) !important;
                    top: calc(0.75rem + env(safe-area-inset-top)) !important;
                    left: 0.75rem !important;
                    z-index: 100000 !important;
                    display: flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    width: 2.5rem !important;
                    height: 2.5rem !important;
                    min-width: 2.5rem !important;
                    min-height: 2.5rem !important;
                    pointer-events: auto !important;
                    border: 1px solid rgba(255, 255, 255, 0.2) !important;
                    border-radius: 0.75rem !important;
                    background-color: rgba(255, 255, 255, 0.1) !important;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
                  }
                  @media (min-width: 640px) {
                    [data-hamburger-button] {
                      top: calc(1rem + constant(safe-area-inset-top)) !important;
                      top: calc(1rem + env(safe-area-inset-top)) !important;
                      left: 1rem !important;
                      width: 3rem !important;
                      height: 3rem !important;
                      min-width: 3rem !important;
                      min-height: 3rem !important;
                    }
                  }
                  [data-club-logo-container="true"] {
                    position: absolute !important;
                    top: calc(0.75rem + constant(safe-area-inset-top)) !important;
                    top: calc(0.75rem + env(safe-area-inset-top)) !important;
                    right: 0.75rem !important;
                    z-index: 99999 !important;
                    visibility: visible !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    width: 4rem !important;
                    height: 4rem !important;
                    min-width: 4rem !important;
                    min-height: 4rem !important;
                    max-width: 4rem !important;
                    max-height: 4rem !important;
                    opacity: 1 !important;
                  }
                  @media (min-width: 640px) {
                    [data-club-logo-container="true"] {
                      top: calc(1rem + constant(safe-area-inset-top)) !important;
                      top: calc(1rem + env(safe-area-inset-top)) !important;
                      right: 1rem !important;
                      width: 5rem !important;
                      height: 5rem !important;
                      min-width: 5rem !important;
                      min-height: 5rem !important;
                      max-width: 5rem !important;
                      max-height: 5rem !important;
                    }
                  }
                  @media (min-width: 1024px) {
                    [data-club-logo-container="true"] {
                      width: 6rem !important;
                      height: 6rem !important;
                      min-width: 6rem !important;
                      min-height: 6rem !important;
                      max-width: 6rem !important;
                      max-height: 6rem !important;
                    }
                  }
                  [data-club-logo-container="true"] img {
                    width: 4rem !important;
                    height: 4rem !important;
                    min-width: 4rem !important;
                    min-height: 4rem !important;
                    max-width: 4rem !important;
                    max-height: 4rem !important;
                    object-fit: contain !important;
                  }
                  @media (min-width: 640px) {
                    [data-club-logo-container="true"] img {
                      width: 5rem !important;
                      height: 5rem !important;
                      min-width: 5rem !important;
                      min-height: 5rem !important;
                      max-width: 5rem !important;
                      max-height: 5rem !important;
                    }
                  }
                  @media (min-width: 1024px) {
                    [data-club-logo-container="true"] img {
                      width: 6rem !important;
                      height: 6rem !important;
                      min-width: 6rem !important;
                      min-height: 6rem !important;
                      max-width: 6rem !important;
                      max-height: 6rem !important;
                    }
                  }
                \`;
                document.head.appendChild(criticalStyle);
                
                // Forcer l'affichage dès que le DOM est disponible
                function forceDisplay() {
                  var button = document.querySelector('[data-hamburger-button]');
                  var logo = document.querySelector('[data-club-logo-container="true"]');
                  
                  if (button) {
                    // Responsive: mobile par défaut
                    const isMobile = window.innerWidth < 640;
                    const isDesktop = window.innerWidth >= 1024;
                    // Calculer la safe area top (pour iOS)
                    const safeAreaTop = window.visualViewport ? (window.visualViewport.offsetTop || 0) : (parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)')) || 0);
                    const baseTop = isMobile ? 0.75 : 1;
                    const top = (baseTop + (safeAreaTop / 16)) + 'rem'; // Convertir px en rem (16px = 1rem)
                    const left = isMobile ? '0.75rem' : '1rem';
                    const size = isMobile ? '2.5rem' : '3rem';
                    button.style.cssText = 'position: fixed !important; top: calc(' + baseTop + 'rem + env(safe-area-inset-top)) !important; left: ' + left + ' !important; z-index: 100000 !important; display: flex !important; visibility: visible !important; opacity: 1 !important; width: ' + size + ' !important; height: ' + size + ' !important; min-width: ' + size + ' !important; min-height: ' + size + ' !important; pointer-events: auto !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; border-radius: 0.75rem !important; background-color: rgba(255, 255, 255, 0.1) !important; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;';
                  }
                  
                  if (logo) {
                    // Responsive: mobile -> tablette -> desktop
                    const isMobile = window.innerWidth < 640;
                    const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;
                    const isDesktop = window.innerWidth >= 1024;
                    const baseTop = isMobile ? 0.75 : 1;
                    const right = isMobile ? '0.75rem' : '1rem';
                    const size = isMobile ? '4rem' : (isTablet ? '5rem' : '6rem');
                    logo.style.cssText = 'position: absolute !important; top: calc(' + baseTop + 'rem + env(safe-area-inset-top)) !important; right: ' + right + ' !important; z-index: 99999 !important; visibility: visible !important; display: flex !important; align-items: center !important; justify-content: center !important; width: ' + size + ' !important; height: ' + size + ' !important; min-width: ' + size + ' !important; min-height: ' + size + ' !important; max-width: ' + size + ' !important; max-height: ' + size + ' !important; opacity: 1 !important;';
                    // Forcer la taille des images à l'intérieur du conteneur
                    const logoImages = logo.querySelectorAll('img');
                    logoImages.forEach((img) => {
                      img.style.cssText = 'width: ' + size + ' !important; height: ' + size + ' !important; min-width: ' + size + ' !important; min-height: ' + size + ' !important; max-width: ' + size + ' !important; max-height: ' + size + ' !important; object-fit: contain !important;';
                    });
                  }
                }
                
                // Exécuter immédiatement si DOM déjà prêt
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', forceDisplay);
                } else {
                  forceDisplay();
                }
                
                // Re-forcer après un court délai pour garantir l'affichage
                setTimeout(forceDisplay, 0);
                setTimeout(forceDisplay, 50);
                setTimeout(forceDisplay, 100);
                setTimeout(forceDisplay, 200);
                setTimeout(forceDisplay, 500);
              })();
            `,
          }}
        />
      </head>
      <body className="bg-black text-white min-h-screen" style={{ backgroundColor: '#000' }} suppressHydrationWarning>
        <SafeAreas />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
