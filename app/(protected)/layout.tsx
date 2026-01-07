// Layout pour toutes les pages du compte joueur
// Ce fichier assure une typographie cohérente sur toutes les pages
// TOUJOURS afficher le menu hamburger et le logo du club sur TOUS les formats
// Même pour les nouveaux joueurs qui viennent de s'inscrire
import PlayerSidebar from '@/components/PlayerSidebar';
import PlayerClubLogo from '@/components/PlayerClubLogo';
import PlayerSafeAreaColor from '@/components/PlayerSafeAreaColor';

export default function PlayerAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Script critique pour appliquer la couleur de la safe area IMMÉDIATEMENT (avant React) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Appliquer la couleur bleue immédiatement pour les pages joueur
              const blueColor = '#172554';
              
              // Appliquer sur body et html
              document.body.style.backgroundColor = blueColor;
              document.documentElement.style.backgroundColor = blueColor;
              document.body.setAttribute('data-player-layout', 'true');
              document.documentElement.setAttribute('data-player-layout', 'true');
              // Ajouter la classe player-page pour le CSS
              document.body.classList.add('player-page');
              document.documentElement.classList.add('player-page');
              
              // Notifier la vue native iOS pour mettre à jour la couleur des safe areas
              function notifyNativeColor(color) {
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.updateSafeAreaColor) {
                  window.webkit.messageHandlers.updateSafeAreaColor.postMessage(color);
                } else if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
                  // Alternative via Capacitor
                  try {
                    window.Capacitor.Plugins.App.addListener('appStateChange', function(state) {
                      // Forcer la mise à jour
                    });
                  } catch(e) {}
                }
              }
              
              // Notifier immédiatement
              notifyNativeColor(blueColor);
              
              // Réessayer plusieurs fois pour s'assurer que le message passe
              setTimeout(function() { notifyNativeColor(blueColor); }, 100);
              setTimeout(function() { notifyNativeColor(blueColor); }, 500);
              setTimeout(function() { notifyNativeColor(blueColor); }, 1000);
            })();
          `,
        }}
      />
      {/* Composant client pour gérer la couleur de la safe area (bleue pour pages joueur) */}
      <PlayerSafeAreaColor />
      {/* Styles critiques inline pour garantir l'affichage AVANT l'hydratation React */}
      {/* Responsive: mobile -> tablette -> desktop */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
          `,
        }}
      />
      {/* Menu hamburger - TOUJOURS visible sur TOUS les formats (desktop au mobile) - Même pour nouveaux joueurs */}
      {/* Composant client, s'affiche immédiatement sans attendre la vérification du club_id */}
      <PlayerSidebar />
      {/* Conteneur principal avec fond bleu (blue-950) qui s'étend dans toute la safe area pour les pages joueur */}
      <div 
        className="relative min-h-screen"
        style={{
          minHeight: '100vh',
          minHeight: '-webkit-fill-available',
          backgroundColor: '#172554', // blue-950 de Tailwind
        }}
      >
        {/* Logo du club - TOUJOURS visible sur TOUS les formats (desktop au mobile) - Même pour nouveaux joueurs */}
        {/* NE PLUS utiliser Suspense - afficher directement pour garantir la visibilité immédiate */}
        <PlayerClubLogo />
        {/* Contenu des pages - démarre sous la barre de statut avec padding-top */}
        <div 
          className="relative min-h-screen"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingTop: 'constant(safe-area-inset-top)', // Fallback pour iOS < 11.2
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}


