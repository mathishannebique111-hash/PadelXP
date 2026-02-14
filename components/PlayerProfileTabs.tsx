'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PadelLoader from "@/components/ui/PadelLoader";

type TabType = 'profil' | 'stats' | 'badges' | 'club';

interface PlayerProfileTabsProps {
  activeTab?: TabType;
  profilContent: React.ReactNode;
  statsContent: React.ReactNode;
  badgesContent?: React.ReactNode;
  clubContent?: React.ReactNode;
  initialPendingRequestsCount?: number;
}

function PlayerProfileTabsContent({
  activeTab = 'profil',
  profilContent,
  statsContent,
  badgesContent,
  clubContent,
  initialPendingRequestsCount = 0
}: PlayerProfileTabsProps) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get('tab') as TabType | null;
  const initialTab = tabFromUrl && ['profil', 'stats', 'badges', 'club'].includes(tabFromUrl) ? tabFromUrl : activeTab;
  const [currentTab, setCurrentTab] = useState<TabType>(initialTab);
  const [pendingPartnershipRequestsCount, setPendingPartnershipRequestsCount] = useState(initialPendingRequestsCount);
  const [loadedTabs, setLoadedTabs] = useState<Set<TabType>>(new Set([initialTab]));
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Si on n'a pas reçu de count initial (ou si on veut rafraichir), on charge
    if (initialPendingRequestsCount === 0) {
      loadPendingPartnershipRequestsCount();
    }

    // Écouter les événements de mise à jour du profil
    const handlePartnershipEvent = () => {
      loadPendingPartnershipRequestsCount();
      // Forcer le rafraîchissement des Server Components
      router.refresh();
    };
    window.addEventListener("profileUpdated", handlePartnershipEvent);
    return () => {
      window.removeEventListener("profileUpdated", handlePartnershipEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPendingPartnershipRequestsCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Compter les invitations de partenaires habituels reçues
      const { count: partnershipInvitationsCount, error: partnershipInvitationsError } = await supabase
        .from('player_partnerships')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', user.id)
        .eq('status', 'pending');

      if (partnershipInvitationsError) {
        console.error('[PlayerProfileTabs] Erreur count partnership requests', partnershipInvitationsError);
        return;
      }

      setPendingPartnershipRequestsCount(partnershipInvitationsCount || 0);
    } catch (error) {
      console.error('[PlayerProfileTabs] Erreur chargement demandes partenaires', error);
    }
  };

  useEffect(() => {
    if (tabFromUrl && ['profil', 'stats', 'badges', 'club'].includes(tabFromUrl)) {
      setCurrentTab(tabFromUrl);
      setLoadedTabs(prev => new Set(prev).add(tabFromUrl));
    }
  }, [tabFromUrl]);

  const tabs = [
    { id: 'profil' as TabType, label: 'Profil', badge: pendingPartnershipRequestsCount },
    { id: 'stats' as TabType, label: 'Stats' },
    { id: 'badges' as TabType, label: 'Badges' },
    { id: 'club' as TabType, label: 'Club' },
  ];

  return (
    <div className="w-full">
      {/* Onglets */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setCurrentTab(tab.id);
              setLoadedTabs(prev => new Set(prev).add(tab.id));
              // Mettre à jour l'URL sans recharger la page pour que le reload() garde l'onglet
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.set('tab', tab.id);
              window.history.replaceState(null, '', newUrl.toString());
            }}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-all duration-200 relative ${currentTab === tab.id
              ? 'text-white border-b-2 border-padel-green'
              : 'text-white/60 hover:text-white/80'
              }`}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </span>
            {currentTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-padel-green" />
            )}
          </button>
        ))}
      </div>

      {/* Contenu des onglets - LAZY LOADED pour éviter de charger PlayerSummary/etc si pas utile */}
      <div className="mt-4 sm:mt-6">
        <div style={{ display: currentTab === 'profil' ? 'block' : 'none' }}>
          {profilContent}
        </div>

        {/* On ne monte les autres onglets que s'ils ont été visités au moins une fois */}
        {loadedTabs.has('stats') && (
          <div style={{ display: currentTab === 'stats' ? 'block' : 'none' }}>
            {statsContent}
          </div>
        )}

        {badgesContent && loadedTabs.has('badges') && (
          <div style={{ display: currentTab === 'badges' ? 'block' : 'none' }}>
            {badgesContent}
          </div>
        )}

        {clubContent && loadedTabs.has('club') && (
          <div style={{ display: currentTab === 'club' ? 'block' : 'none' }}>
            {clubContent}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlayerProfileTabs(props: PlayerProfileTabsProps) {
  return (
    <Suspense fallback={
      <div className="w-full">
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 border-b border-white/10">
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Profil</div>
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Stats</div>
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Badges</div>
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Club</div>
        </div>
        <div className="mt-4 sm:mt-6 flex items-center justify-center py-12">
          <PadelLoader />
        </div>
      </div>
    }>
      <PlayerProfileTabsContent {...props} />
    </Suspense>
  );
}
