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
import { extractSubdomain, getClubBranding } from '@/lib/club-branding';
import { syncUserClubProfile, getUserClubInfo } from '@/lib/utils/club-utils';
import { getClubLogoPublicUrl } from '@/lib/utils/club-logo-utils';
import { headers } from 'next/headers';

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

  // Récupérer les informations du club pour le branding
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = headersList.get('x-club-subdomain') || extractSubdomain(host);

  let publicLogoUrl = null;

  if (subdomain) {
    const clubBranding = await getClubBranding(subdomain);
    if (clubBranding && clubBranding.id) {
      // Le logo du club du sous-domaine est prioritaire
      publicLogoUrl = getClubLogoPublicUrl(clubBranding.logo_url);
      
      // Si l'utilisateur est connecté, on synchronise son profil avec le club du domaine actuel
      if (user) {
        await syncUserClubProfile(user.id, clubBranding.id, clubBranding.slug);
      }
    }
  } else {
    // Si pas de sous-domaine (PadelXP principal), on utilise les infos du profil si elles existent
    const { clubLogoUrl, clubId } = await getUserClubInfo(user);
    publicLogoUrl = clubLogoUrl ? getClubLogoPublicUrl(clubLogoUrl) : null;
    
    // Si l'utilisateur est sur l'app principale mais que getUserClubInfo 
    // a détecté que son club n'existe plus (ou s'il n'en a plus), 
    // on s'assure que son profil est bien synchronisé en mode "sans club"
    if (user && !clubId) {
      await syncUserClubProfile(user.id, null, null);
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
            className="relative min-h-screen overflow-hidden"
            style={{
              minHeight: '100vh',
              backgroundColor: 'rgb(var(--theme-player-page))',
            }}
            data-club-subdomain={subdomain || ''}
          >
            {/* Background global pour toutes les pages joueur */}
            {/* Le dégradé est affiché UNIQUEMENT pour PadelXP de base, pas pour les apps club */}
            {!subdomain && (
              <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent 0%, transparent 160px, rgba(0,0,0,0.8) 70%, #000000 100%)' }} />
            )}

            {/* Logo PadelXP Header (scroll avec contenus) */}
            <HeaderLogo logoUrl={publicLogoUrl} />

            {/* Logo du club + Settings (Top Right) - Logo à gauche, Settings à droite */}
            <div
              data-header-actions="true"
              className="absolute z-[100] flex flex-row items-center gap-1.5 pointer-events-auto"
              style={{
                top: 'calc(var(--sat, 0px) + 0.75rem)',
                right: '0.75rem'
              }}
            >
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
          <BottomNavBar />
        </ChallengeProvider>
      </PopupQueueProvider>
    </>
  );
}
