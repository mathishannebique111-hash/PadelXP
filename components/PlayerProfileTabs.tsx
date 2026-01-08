'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type TabType = 'stats' | 'leaderboard' | 'badges';

interface PlayerProfileTabsProps {
  activeTab?: TabType;
  statsContent: React.ReactNode;
  leaderboardContent: React.ReactNode;
  badgesContent: React.ReactNode;
}

function PlayerProfileTabsContent({ 
  activeTab = 'stats',
  statsContent,
  leaderboardContent,
  badgesContent
}: PlayerProfileTabsProps) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams?.get('tab') as TabType | null;
  const initialTab = tabFromUrl && ['stats', 'leaderboard', 'badges'].includes(tabFromUrl) ? tabFromUrl : activeTab;
  const [currentTab, setCurrentTab] = useState<TabType>(initialTab);

  useEffect(() => {
    if (tabFromUrl && ['stats', 'leaderboard', 'badges'].includes(tabFromUrl)) {
      setCurrentTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const tabs = [
    { id: 'stats' as TabType, label: 'Mes stats' },
    { id: 'leaderboard' as TabType, label: 'Classement global' },
    { id: 'badges' as TabType, label: 'Mes badges' },
  ];

  return (
    <div className="w-full">
      {/* Onglets */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-all duration-200 relative ${
              currentTab === tab.id
                ? 'text-white border-b-2 border-blue-400'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            {tab.label}
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

