'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type TabType = 'stats' | 'leaderboard' | 'badges' | 'padel';

interface PlayerProfileTabsProps {
  activeTab?: TabType;
  statsContent: React.ReactNode;
  leaderboardContent: React.ReactNode;
  badgesContent: React.ReactNode;
  padelContent?: React.ReactNode;
}

function PlayerProfileTabsContent({
  activeTab = 'stats',
  statsContent,
  leaderboardContent,
  badgesContent,
  padelContent
}: PlayerProfileTabsProps) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get('tab') as TabType | null;
  const initialTab = tabFromUrl && ['stats', 'leaderboard', 'badges', 'padel'].includes(tabFromUrl) ? tabFromUrl : activeTab;
  const [currentTab, setCurrentTab] = useState<TabType>(initialTab);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    loadPendingInvitationsCount();
    const interval = setInterval(loadPendingInvitationsCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingInvitationsCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('match_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('[PlayerProfileTabs] Erreur count invitations', error);
        return;
      }

      setPendingInvitationsCount(count || 0);
    } catch (error) {
      console.error('[PlayerProfileTabs] Erreur inattendue', error);
    }
  };

  useEffect(() => {
    if (tabFromUrl && ['stats', 'leaderboard', 'badges', 'padel'].includes(tabFromUrl)) {
      setCurrentTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const tabs = [
    { id: 'stats' as TabType, label: 'Mes stats' },
    { id: 'leaderboard' as TabType, label: 'Classement global' },
    { id: 'badges' as TabType, label: 'Mes badges' },
    { id: 'padel' as TabType, label: 'Mon Profil Padel', badge: pendingInvitationsCount },
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
                ? 'text-white border-b-2 border-blue-400'
                : 'text-white/60 hover:text-white/80'
              }`}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {tab.badge}
                </span>
              )}
            </span>
            {currentTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* Contenu des onglets - GARDER TOUS MONTÉS pour les event listeners */}
      <div className="mt-4 sm:mt-6">
        <div style={{ display: currentTab === 'stats' ? 'block' : 'none' }}>
          {statsContent}
        </div>
        <div style={{ display: currentTab === 'leaderboard' ? 'block' : 'none' }}>
          {leaderboardContent}
        </div>
        <div style={{ display: currentTab === 'badges' ? 'block' : 'none' }}>
          {badgesContent}
        </div>
        {padelContent && (
          <div style={{ display: currentTab === 'padel' ? 'block' : 'none' }}>
            {padelContent}
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
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Mes stats</div>
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Classement global</div>
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Mes badges</div>
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-white/60">Mon Profil Padel</div>
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

