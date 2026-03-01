import { Suspense } from 'react';
import PlayerSidebar from '@/components/PlayerSidebar';
import BottomNavBar from '@/components/BottomNavBar';
import PlayerClubLogo from '@/components/PlayerClubLogo';
import HeaderLogo from '@/components/HeaderLogo';
import PlayerSafeAreaColor from '@/components/PlayerSafeAreaColor';
import { PopupQueueProvider } from '@/contexts/PopupQueueContext';
import { ChallengeProvider } from '@/contexts/ChallengeContext';
import PopupQueueRenderer from '@/components/notifications/PopupQueueRenderer';
import HideSplashScreen from '@/components/HideSplashScreen';
import GlobalNotificationListener from '@/components/notifications/GlobalNotificationListener';
import ToastContainer from '@/components/ui/Toast';
import PremiumSuccessNotifier from '@/components/notifications/PremiumSuccessNotifier';
import { createClient } from '@/lib/supabase/server';
import { getPlayerChallenges } from '@/lib/challenges';

export default async function PlayerAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialChallenge = null;
  let isPremiumUser = false;

  if (user) {
    try {
      const result = await getPlayerChallenges(user.id);
      isPremiumUser = result.isPremiumUser;

      // Trouver le premier challenge actif à mettre en avant (logique identique au Provider)
      const activeChallenge = (result.challenges || []).find(c => {
        if (c.isPremium && !isPremiumUser) return false;
        return c.status === "active" && !c.rewardClaimed;
      });

      initialChallenge = activeChallenge || null;
    } catch (e) {
      console.error("[PlayerAccountLayout] Failed to pre-fetch challenges", e);
    }
  }

  return (
    <>
      <PlayerSafeAreaColor />
      <HideSplashScreen />
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.classList.add('player-page');`
        }}
      />
      <PopupQueueProvider>
        <ChallengeProvider initialChallenge={initialChallenge} initialIsPremiumUser={isPremiumUser}>
          <div
            className="relative min-h-screen overflow-hidden bg-[#172554]"
            style={{
              minHeight: '100vh',
            }}
          >
            {/* Background global pour toutes les pages joueur */}
            {/* Le dégradé commence un peu plus bas pour laisser le haut (safe area) parfaitement bleu #172554 */}
            <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 0%, transparent 160px, rgba(0,0,0,0.8) 70%, #000000 100%)' }} />

            {/* Logo PadelXP Header (scroll avec contenus) */}
            <HeaderLogo />

            {/* Logo du club + Settings (Top Right) - Logo à gauche, Settings à droite */}
            <div
              data-header-actions="true"
              className="fixed z-[100] flex flex-row items-center gap-1.5 pointer-events-auto"
              style={{
                top: 'calc(var(--sat, 0px) + 0.75rem)',
                right: '0.75rem'
              }}
            >
              <PlayerClubLogo />
              <Suspense fallback={null}>
                <PlayerSidebar />
              </Suspense>
            </div>

            {/* Contenu des pages - avec padding bottom pour la nav bar */}
            <div className="relative z-10 min-h-screen app-content-padding pb-24">
              {children}
            </div>
            {/* Écouteur global pour les notifications de badges et niveaux */}
            <GlobalNotificationListener />
            {/* Nouveau : Écouteur pour le succès du paiement Premium */}
            <PremiumSuccessNotifier />
            {/* Renderer pour afficher les popups de la file d'attente */}
            <PopupQueueRenderer />
            {/* Toast notifications */}
            <ToastContainer />
          </div>
          {/* Barre de navigation en bas */}
          <Suspense fallback={null}>
            <BottomNavBar />
          </Suspense>
        </ChallengeProvider>
      </PopupQueueProvider>
    </>
  );
}
