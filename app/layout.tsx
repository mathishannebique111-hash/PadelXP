import type { Metadata } from "next";
import "./globals.css";
import CookieConsent from "@/components/cookies/CookieConsent";

export const metadata: Metadata = {
  title: "PadelLeague",
  description: "Leaderboards, rangs, badges et ligues pour complexes de padel",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="bg-black">
      <head>
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
                    top: 1rem !important;
                    left: 1rem !important;
                    z-index: 99999 !important;
                    display: flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    width: 3rem !important;
                    height: 3rem !important;
                    min-width: 3rem !important;
                    min-height: 3rem !important;
                    pointer-events: auto !important;
                  }
                  [data-club-logo-container="true"] {
                    position: fixed !important;
                    top: 0.25rem !important;
                    right: 0.25rem !important;
                    z-index: 99999 !important;
                    visibility: visible !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    opacity: 1 !important;
                  }
                \`;
                document.head.appendChild(criticalStyle);
                
                // Forcer l'affichage dès que le DOM est disponible
                function forceDisplay() {
                  var button = document.querySelector('[data-hamburger-button]');
                  var logo = document.querySelector('[data-club-logo-container="true"]');
                  
                  if (button) {
                    button.style.cssText = 'position: fixed !important; top: 1rem !important; left: 1rem !important; z-index: 99999 !important; display: flex !important; visibility: visible !important; opacity: 1 !important; width: 3rem !important; height: 3rem !important; min-width: 3rem !important; min-height: 3rem !important; pointer-events: auto !important;';
                  }
                  
                  if (logo) {
                    logo.style.cssText = 'position: fixed !important; top: 0.25rem !important; right: 0.25rem !important; z-index: 99999 !important; visibility: visible !important; display: flex !important; align-items: center !important; justify-content: center !important; opacity: 1 !important;';
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

