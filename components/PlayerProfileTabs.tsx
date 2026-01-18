'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type TabType = 'profil' | 'stats' | 'badges';

interface PlayerProfileTabsProps {
  activeTab?: TabType;
  profilContent: React.ReactNode;
  statsContent: React.ReactNode;
  badgesContent?: React.ReactNode;
}

function PlayerProfileTabsContent({
  activeTab = 'profil',
  profilContent,
  statsContent,
  badgesContent
}: PlayerProfileTabsProps) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get('tab') as TabType | null;
  const initialTab = tabFromUrl && ['profil', 'stats', 'badges'].includes(tabFromUrl) ? tabFromUrl : activeTab;
  const [currentTab, setCurrentTab] = useState<TabType>(initialTab);
  const [pendingPartnershipRequestsCount, setPendingPartnershipRequestsCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    loadPendingPartnershipRequestsCount();
    // Écouter les événements de mise à jour du profil
    const handlePartnershipEvent = () => {
      loadPendingPartnershipRequestsCount();
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
    if (tabFromUrl && ['profil', 'stats', 'badges'].includes(tabFromUrl)) {
      setCurrentTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const tabs = [
    { id: 'profil' as TabType, label: 'Mon profil', badge: pendingPartnershipRequestsCount },
    { id: 'stats' as TabType, label: 'Mes stats' },
    { id: 'badges' as TabType, label: 'Mes badges' },
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

      {/* Contenu des onglets - GARDER TOUS MONTÉS pour les event listeners */}
      <div className="mt-4 sm:mt-6">
        <div style={{ display: currentTab === 'profil' ? 'block' : 'none' }}>
          {profilContent}
        </div>
        <div style={{ display: currentTab === 'stats' ? 'block' : 'none' }}>
          {statsContent}
        </div>
        {badgesContent && (
          <div style={{ display: currentTab === 'badges' ? 'block' : 'none' }}>
            {badgesContent}
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
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Mon profil</div>
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Mes stats</div>
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Mes badges</div>
        </div>
        <div className="mt-4 sm:mt-6 flex items-center justify-center">
          <div className="text-white/60">Chargement...</div>
        </div>
      </div>
    }>
      <PlayerProfileTabsContent {...props} />
    </Suspense>
  );
}
