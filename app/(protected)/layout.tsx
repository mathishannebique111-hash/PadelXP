// Layout pour toutes les pages du compte joueur
// Ce fichier assure une typographie cohérente sur toutes les pages
// TOUJOURS afficher le menu hamburger et le logo du club sur TOUS les formats
// Même pour les nouveaux joueurs qui viennent de s'inscrire
import PlayerSidebar from '@/components/PlayerSidebar';
import PlayerClubLogo from '@/components/PlayerClubLogo';

export default function PlayerAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Styles critiques inline pour garantir l'affichage AVANT l'hydratation React */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
              position: absolute !important;
              top: 1rem !important;
              right: 1rem !important;
              z-index: 99999 !important;
              visibility: visible !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              width: 6rem !important;
              height: 6rem !important;
              min-width: 6rem !important;
              min-height: 6rem !important;
              max-width: 6rem !important;
              max-height: 6rem !important;
              opacity: 1 !important;
            }
            [data-club-logo-container="true"] img {
              width: 6rem !important;
              height: 6rem !important;
              min-width: 6rem !important;
              min-height: 6rem !important;
              max-width: 6rem !important;
              max-height: 6rem !important;
              object-fit: contain !important;
            }
          `,
        }}
      />
      {/* Menu hamburger - TOUJOURS visible sur TOUS les formats (desktop au mobile) - Même pour nouveaux joueurs */}
      {/* Composant client, s'affiche immédiatement sans attendre la vérification du club_id */}
      <PlayerSidebar />
      <div className="relative min-h-screen">
        {/* Logo du club - TOUJOURS visible sur TOUS les formats (desktop au mobile) - Même pour nouveaux joueurs */}
        {/* NE PLUS utiliser Suspense - afficher directement pour garantir la visibilité immédiate */}
        <PlayerClubLogo />
        {children}
      </div>
    </>
  );
}


