// Layout pour toutes les pages du compte joueur
// Ce fichier assure une typographie cohérente sur toutes les pages
// TOUJOURS afficher le menu hamburger et le logo du club sur TOUS les formats
// Même pour les nouveaux joueurs qui viennent de s'inscrire
import { Suspense } from 'react';
import PlayerSidebar from '@/components/PlayerSidebar';
import PlayerClubLogo from '@/components/PlayerClubLogo';
import PlayerSafeAreaColor from '@/components/PlayerSafeAreaColor';
import { PopupQueueProvider } from '@/contexts/PopupQueueContext';
import PopupQueueRenderer from '@/components/notifications/PopupQueueRenderer';
import GlobalNotificationListener from '@/components/notifications/GlobalNotificationListener';
import ToastContainer from '@/components/ui/Toast';

export default function PlayerAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Configuration spécifique pour les pages joueurs */}
      <PlayerSafeAreaColor />
      <PopupQueueProvider>
        {/* Menu hamburger - TOUJOURS visible sur TOUS les formats (desktop au mobile) - Même pour nouveaux joueurs */}
        {/* Composant client, s'affiche immédiatement sans attendre la vérification du club_id */}
        {/* Enveloppé dans Suspense car utilise useSearchParams() */}
        <Suspense fallback={null}>
          <PlayerSidebar />
        </Suspense>
        {/* Conteneur principal avec fond bleu (blue-950) qui s'étend dans toute la safe area pour les pages joueur */}
        <div
          className="relative min-h-screen"
          style={{
            minHeight: '100vh',
            backgroundColor: '#172554', // blue-950 de Tailwind
          }}
        >
          {/* Logo du club - TOUJOURS visible sur TOUS les formats (desktop au mobile) - Même pour nouveaux joueurs */}
          {/* NE PLUS utiliser Suspense - afficher directement pour garantir la visibilité immédiate */}
          <PlayerClubLogo />
          {/* Contenu des pages - démarre sous la barre de statut avec padding-top (app uniquement) */}
          <div
            className="relative min-h-screen app-content-padding"
            style={{
              backgroundColor: '#172554'
            }}
          >
            {children}
          </div>
          {/* Écouteur global pour les notifications de badges et niveaux */}
          <GlobalNotificationListener />
          {/* Renderer pour afficher les popups de la file d'attente */}
          <PopupQueueRenderer />
          {/* Toast notifications */}
          <ToastContainer />
        </div>
      </PopupQueueProvider>
    </>
  );
}


