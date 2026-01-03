import type { Metadata } from "next";
import "./globals.css";
import CookieConsent from "@/components/cookies/CookieConsent";




export const metadata: Metadata = {
  title: "PadelXP",
  description: "Leaderboards, rangs, badges et ligues pour complexes de padel",
  icons: {
    icon: "/images/flavicon.png",
    shortcut: "/images/flavicon.png",
    apple: "/images/flavicon.png",
  },
};




export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="bg-black">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        
        {/* Script de détection app/web - NOUVEAU */}
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
                    top: 0.75rem !important;
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
                      top: 1rem !important;
                      left: 1rem !important;
                      width: 3rem !important;
                      height: 3rem !important;
                      min-width: 3rem !important;
                      min-height: 3rem !important;
                    }
                  }
                  [data-club-logo-container="true"] {
                    position: absolute !important;
                    top: 0.75rem !important;
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
                      top: 1rem !important;
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
                    const top = isMobile ? '0.75rem' : '1rem';
                    const left = isMobile ? '0.75rem' : '1rem';
                    const size = isMobile ? '2.5rem' : '3rem';
                    button.style.cssText = 'position: fixed !important; top: ' + top + ' !important; left: ' + left + ' !important; z-index: 100000 !important; display: flex !important; visibility: visible !important; opacity: 1 !important; width: ' + size + ' !important; height: ' + size + ' !important; min-width: ' + size + ' !important; min-height: ' + size + ' !important; pointer-events: auto !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; border-radius: 0.75rem !important; background-color: rgba(255, 255, 255, 0.1) !important; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;';
                  }
                  
                  if (logo) {
                    // Responsive: mobile -> tablette -> desktop
                    const isMobile = window.innerWidth < 640;
                    const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;
                    const isDesktop = window.innerWidth >= 1024;
                    const top = isMobile ? '0.75rem' : '1rem';
                    const right = isMobile ? '0.75rem' : '1rem';
                    const size = isMobile ? '4rem' : (isTablet ? '5rem' : '6rem');
                    logo.style.cssText = 'position: absolute !important; top: ' + top + ' !important; right: ' + right + ' !important; z-index: 99999 !important; visibility: visible !important; display: flex !important; align-items: center !important; justify-content: center !important; width: ' + size + ' !important; height: ' + size + ' !important; min-width: ' + size + ' !important; min-height: ' + size + ' !important; max-width: ' + size + ' !important; max-height: ' + size + ' !important; opacity: 1 !important;';
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
      <body className="bg-black text-white min-h-screen">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
