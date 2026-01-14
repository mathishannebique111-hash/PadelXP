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
        <div
          className="relative min-h-screen overflow-hidden bg-[#172554]"
          style={{
            minHeight: '100vh',
          }}
        >
          {/* Background global pour toutes les pages joueur */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black z-0 pointer-events-none" />

          {/* Logo du club - TOUJOURS visible sur TOUS les formats */}
          <PlayerClubLogo />

          {/* Contenu des pages - démarre sous la barre de statut avec padding-top (app uniquement) */}
          <div className="relative z-10 min-h-screen app-content-padding">
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


